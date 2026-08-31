import mongoose from 'mongoose';
import { startOfWeek } from 'date-fns';
import { User } from '../models/User.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { Notification } from '../models/Notification.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

// @desc    Search for users to add as friend (excluding self and sensitive data)
// @desc    Search for users to add as friend (excluding self and sensitive data)
// @route   GET /api/social/users/search?q=query
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const filter = { _id: { $ne: req.user._id } };
      if (query) {
        filter.$or = [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ];
      }
      const users = await User.find(filter)
        .select('name email avatar level xp isPremium status')
        .sort({ xp: -1 })
        .limit(10);

      const safeUsers = users.map((u) => {
        if (u.status === 'blocked') {
          return {
            _id: u._id,
            id: u._id,
            name: u.name,
            email: '',
            avatar: null,
            isBlocked: true,
            status: 'blocked',
            blockedMessage: 'This account is blocked by admin',
            level: 0,
            xp: 0,
            isPremium: false,
          };
        }
        return {
          _id: u._id,
          id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || null,
          level: u.level || 1,
          xp: u.xp || 0,
          status: u.status || 'active',
          isPremium: !!u.isPremium,
        };
      });

      return res.json(safeUsers);
    } else {
      const q = query.toLowerCase();
      const users = (inMemoryDB.users || [])
        .filter((u) => (u._id || u.id).toString() !== currentUserIdStr)
        .filter((u) => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        .map((u) => {
          if (u.status === 'blocked') {
            return {
              _id: u._id || u.id,
              id: u._id || u.id,
              name: u.name,
              email: '',
              avatar: null,
              isBlocked: true,
              status: 'blocked',
              blockedMessage: 'This account is blocked by admin',
              level: 0,
              xp: 0,
              isPremium: false,
            };
          }
          return {
            _id: u._id || u.id,
            id: u._id || u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar || null,
            level: u.level || 1,
            xp: u.xp || 0,
            status: u.status || 'active',
            isPremium: !!u.isPremium,
          };
        });
      return res.json(users);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get suggested friends (excluding self, existing friends, pending requests, and blocked users, limit 4)
// @route   GET /api/social/friends/suggested
export const getSuggestedFriends = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const existingReqs = await FriendRequest.find({
        $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        status: { $in: ['accepted', 'pending'] },
      });

      const excludedIds = [req.user._id];
      existingReqs.forEach((r) => {
        const sId = r.senderId.toString();
        const rId = r.receiverId.toString();
        if (sId === currentUserIdStr) excludedIds.push(r.receiverId);
        else excludedIds.push(r.senderId);
      });

      const suggestedUsers = await User.find({
        _id: { $nin: excludedIds },
        status: { $ne: 'blocked' },
      })
        .select('name email avatar level xp isPremium')
        .sort({ xp: -1 })
        .limit(4);

      return res.json(suggestedUsers);
    } else {
      const userReqs = (inMemoryDB.friendRequests || []).filter(
        (r) =>
          (r.senderId === currentUserIdStr || r.receiverId === currentUserIdStr) &&
          ['accepted', 'pending'].includes(r.status)
      );
      const excludedIds = new Set([currentUserIdStr]);
      userReqs.forEach((r) => {
        if (r.senderId === currentUserIdStr) excludedIds.add(r.receiverId.toString());
        else excludedIds.add(r.senderId.toString());
      });

      const suggestedUsers = (inMemoryDB.users || [])
        .filter((u) => !excludedIds.has((u._id || u.id).toString()) && u.status !== 'blocked')
        .map((u) => ({
          _id: u._id || u.id,
          id: u._id || u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || null,
          level: u.level || 1,
          xp: u.xp || 0,
          isPremium: !!u.isPremium,
        }))
        .slice(0, 4);

      return res.json(suggestedUsers);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a friend request
// @route   POST /api/social/friends/request/:receiverId
export const sendFriendRequest = async (req, res) => {
  try {
    const receiverId = req.params.receiverId;
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (receiverId === currentUserIdStr) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
      }

      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (receiver.status === 'blocked') {
        return res.status(400).json({ message: 'Cannot send friend request to this account' });
      }

      const existing = await FriendRequest.findOne({
        $or: [
          { senderId: req.user._id, receiverId },
          { senderId: receiverId, receiverId: req.user._id },
        ],
      });

      if (existing) {
        if (existing.status === 'accepted') {
          return res.status(400).json({ message: 'You are already friends with this user' });
        }
        if (existing.status === 'pending') {
          if (existing.senderId.toString() === receiverId) {
            existing.status = 'accepted';
            await existing.save();

            await Notification.create({
              userId: receiver._id,
              type: 'friend_accepted',
              title: 'Friend Request Accepted! 🎉',
              message: `${req.user.name} accepted your friend request. You are now friends!`,
            });

            return res.status(200).json({ message: 'Friend request accepted! You are now friends.' });
          } else {
            return res.status(400).json({ message: 'A pending friend request already exists' });
          }
        }
        await FriendRequest.deleteOne({ _id: existing._id });
      }

      await FriendRequest.create({
        senderId: req.user._id,
        receiverId,
        status: 'pending',
      });

      await Notification.create({
        userId: receiver._id,
        type: 'friend_request',
        title: 'New Friend Request 🤝',
        message: `${req.user.name} sent you a friend request.`,
      });
    } else {
      if (!inMemoryDB.friendRequests) inMemoryDB.friendRequests = [];
      if (!inMemoryDB.notifications) inMemoryDB.notifications = [];

      const receiver = (inMemoryDB.users || []).find((u) => (u._id || u.id).toString() === receiverId);
      if (!receiver) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (receiver.status === 'blocked') {
        return res.status(400).json({ message: 'Cannot send friend request to this account' });
      }

      const existingIdx = inMemoryDB.friendRequests.findIndex(
        (r) =>
          (r.senderId === currentUserIdStr && r.receiverId === receiverId) ||
          (r.senderId === receiverId && r.receiverId === currentUserIdStr)
      );

      if (existingIdx !== -1) {
        const existing = inMemoryDB.friendRequests[existingIdx];
        if (existing.status === 'accepted') {
          return res.status(400).json({ message: 'You are already friends with this user' });
        }
        if (existing.status === 'pending') {
          if (existing.senderId === receiverId) {
            existing.status = 'accepted';
            inMemoryDB.notifications.unshift({
              _id: `notif_${Date.now()}`,
              id: `notif_${Date.now()}`,
              userId: receiverId,
              type: 'friend_accepted',
              title: 'Friend Request Accepted! 🎉',
              message: `${req.user.name} accepted your friend request. You are now friends!`,
              read: false,
              createdAt: new Date(),
            });
            return res.status(200).json({ message: 'Friend request accepted! You are now friends.' });
          } else {
            return res.status(400).json({ message: 'A pending friend request already exists' });
          }
        }
        inMemoryDB.friendRequests.splice(existingIdx, 1);
      }

      inMemoryDB.friendRequests.push({
        _id: `freq_${Date.now()}`,
        id: `freq_${Date.now()}`,
        senderId: currentUserIdStr,
        receiverId,
        status: 'pending',
        createdAt: new Date(),
      });

      inMemoryDB.notifications.unshift({
        _id: `notif_${Date.now()}`,
        id: `notif_${Date.now()}`,
        userId: receiverId,
        type: 'friend_request',
        title: 'New Friend Request 🤝',
        message: `${req.user.name} sent you a friend request.`,
        read: false,
        createdAt: new Date(),
      });
    }

    res.status(201).json({ message: 'Friend request sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Respond to friend request (accept/reject)
// @route   PUT /api/social/friends/request/:requestId/respond
export const respondToFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const { action } = req.body;
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accepted or rejected' });
    }

    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID format' });
      }

      const friendReq = await FriendRequest.findById(requestId);
      if (!friendReq) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      if (friendReq.receiverId.toString() !== currentUserIdStr) {
        return res.status(403).json({ message: 'Not authorized to respond to this friend request' });
      }

      if (friendReq.status !== 'pending') {
        return res.status(400).json({ message: 'Friend request is no longer pending' });
      }

      friendReq.status = action;
      await friendReq.save();

      if (action === 'accepted') {
        await Notification.create({
          userId: friendReq.senderId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted! 🎉',
          message: `${req.user.name} accepted your friend request. You are now friends!`,
        });
      }
    } else {
      if (!inMemoryDB.friendRequests) inMemoryDB.friendRequests = [];
      const friendReq = inMemoryDB.friendRequests.find((r) => r._id === requestId || r.id === requestId);
      if (!friendReq) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      if (friendReq.receiverId !== currentUserIdStr) {
        return res.status(403).json({ message: 'Not authorized to respond to this friend request' });
      }

      if (friendReq.status !== 'pending') {
        return res.status(400).json({ message: 'Friend request is no longer pending' });
      }

      friendReq.status = action;
      if (action === 'accepted') {
        if (!inMemoryDB.notifications) inMemoryDB.notifications = [];
        inMemoryDB.notifications.unshift({
          _id: `notif_${Date.now()}`,
          id: `notif_${Date.now()}`,
          userId: friendReq.senderId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted! 🎉',
          message: `${req.user.name} accepted your friend request. You are now friends!`,
          read: false,
          createdAt: new Date(),
        });
      }
    }

    res.json({ message: `Friend request ${action}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a sent friend request
// @route   DELETE /api/social/friends/request/:requestId
export const cancelFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID format' });
      }

      const friendReq = await FriendRequest.findById(requestId);
      if (!friendReq) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      if (friendReq.senderId.toString() !== currentUserIdStr) {
        return res.status(403).json({ message: 'Not authorized to cancel this friend request' });
      }

      if (friendReq.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending friend requests can be cancelled' });
      }

      await FriendRequest.deleteOne({ _id: requestId });
    } else {
      if (!inMemoryDB.friendRequests) inMemoryDB.friendRequests = [];
      const idx = inMemoryDB.friendRequests.findIndex((r) => r._id === requestId || r.id === requestId);
      if (idx === -1) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      const friendReq = inMemoryDB.friendRequests[idx];
      if (friendReq.senderId !== currentUserIdStr) {
        return res.status(403).json({ message: 'Not authorized to cancel this friend request' });
      }

      inMemoryDB.friendRequests.splice(idx, 1);
    }

    res.json({ message: 'Friend request cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's friend list
// @route   GET /api/social/friends
export const getFriendsList = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const acceptedRequests = await FriendRequest.find({
        $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        status: 'accepted',
      }).populate('senderId receiverId', 'name email avatar level xp isPremium status');

      const seenIds = new Set();
      const friends = [];

      for (const r of acceptedRequests) {
        if (!r.senderId || !r.receiverId) continue;
        const friendObj = r.senderId._id.toString() === currentUserIdStr ? r.receiverId : r.senderId;
        const friendIdStr = friendObj._id.toString();

        if (!seenIds.has(friendIdStr)) {
          seenIds.add(friendIdStr);
          if (friendObj.status === 'blocked') {
            friends.push({
              id: friendObj._id,
              _id: friendObj._id,
              name: friendObj.name,
              email: '',
              avatar: null,
              level: 0,
              xp: 0,
              isPremium: false,
              isBlocked: true,
              status: 'blocked',
              blockedMessage: 'This account is blocked by admin',
              requestId: r._id,
            });
          } else {
            friends.push({
              id: friendObj._id,
              _id: friendObj._id,
              name: friendObj.name,
              email: friendObj.email,
              avatar: friendObj.avatar,
              level: friendObj.level || 1,
              xp: friendObj.xp || 0,
              isPremium: !!friendObj.isPremium,
              status: friendObj.status || 'active',
              requestId: r._id,
            });
          }
        }
      }

      return res.json(friends);
    } else {
      const accepted = (inMemoryDB.friendRequests || []).filter(
        (r) => (r.senderId === currentUserIdStr || r.receiverId === currentUserIdStr) && r.status === 'accepted'
      );
      const seenIds = new Set();
      const friends = [];

      for (const r of accepted) {
        const friendId = r.senderId === currentUserIdStr ? r.receiverId : r.senderId;
        if (!seenIds.has(friendId)) {
          seenIds.add(friendId);
          const u = (inMemoryDB.users || []).find((user) => (user._id || user.id).toString() === friendId);
          if (u?.status === 'blocked') {
            friends.push({
              id: friendId,
              _id: friendId,
              name: u ? u.name : 'Blocked Account',
              email: '',
              avatar: null,
              level: 0,
              xp: 0,
              isPremium: false,
              isBlocked: true,
              status: 'blocked',
              blockedMessage: 'This account is blocked by admin',
              requestId: r._id || r.id,
            });
          } else {
            friends.push({
              id: friendId,
              _id: friendId,
              name: u ? u.name : 'Friend',
              email: u ? u.email : '',
              avatar: u ? u.avatar || null : null,
              level: u ? u.level || 1 : 1,
              xp: u ? u.xp || 0 : 0,
              isPremium: u ? !!u.isPremium : false,
              status: u?.status || 'active',
              requestId: r._id || r.id,
            });
          }
        }
      }

      return res.json(friends);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/social/friends/requests
export const getPendingRequests = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const received = await FriendRequest.find({
        receiverId: req.user._id,
        status: 'pending',
      }).populate('senderId', 'name email avatar level xp isPremium status');

      const sent = await FriendRequest.find({
        senderId: req.user._id,
        status: 'pending',
      }).populate('receiverId', 'name email avatar level xp isPremium status');

      return res.json({
        received: received
          .filter((r) => r.senderId && r.senderId.status !== 'blocked')
          .map((r) => ({
            id: r._id,
            _id: r._id,
            sender: {
              id: r.senderId._id,
              _id: r.senderId._id,
              name: r.senderId.name,
              email: r.senderId.email,
              avatar: r.senderId.avatar,
              level: r.senderId.level || 1,
              xp: r.senderId.xp || 0,
              isPremium: !!r.senderId.isPremium,
            },
            status: r.status,
            createdAt: r.createdAt,
          })),
        sent: sent
          .filter((r) => r.receiverId && r.receiverId.status !== 'blocked')
          .map((r) => ({
            id: r._id,
            _id: r._id,
            receiver: {
              id: r.receiverId._id,
              _id: r.receiverId._id,
              name: r.receiverId.name,
              email: r.receiverId.email,
              avatar: r.receiverId.avatar,
              level: r.receiverId.level || 1,
              xp: r.receiverId.xp || 0,
              isPremium: !!r.receiverId.isPremium,
            },
            status: r.status,
            createdAt: r.createdAt,
          })),
      });
    } else {
      const reqs = inMemoryDB.friendRequests || [];
      const users = inMemoryDB.users || [];

      const received = reqs
        .filter((r) => r.receiverId === currentUserIdStr && r.status === 'pending')
        .map((r) => {
          const s = users.find((u) => (u._id || u.id).toString() === r.senderId);
          if (s?.status === 'blocked') return null;
          return {
            id: r._id || r.id,
            _id: r._id || r.id,
            sender: s
              ? {
                  id: s._id || s.id,
                  _id: s._id || s.id,
                  name: s.name,
                  email: s.email,
                  avatar: s.avatar || null,
                  level: s.level || 1,
                  xp: s.xp || 0,
                  isPremium: !!s.isPremium,
                }
              : null,
            status: r.status,
            createdAt: r.createdAt || new Date(),
          };
        })
        .filter(Boolean);

      const sent = reqs
        .filter((r) => r.senderId === currentUserIdStr && r.status === 'pending')
        .map((r) => {
          const rc = users.find((u) => (u._id || u.id).toString() === r.receiverId);
          if (rc?.status === 'blocked') return null;
          return {
            id: r._id || r.id,
            _id: r._id || r.id,
            receiver: rc
              ? {
                  id: rc._id || rc.id,
                  _id: rc._id || rc.id,
                  name: rc.name,
                  email: rc.email,
                  avatar: rc.avatar || null,
                  level: rc.level || 1,
                  xp: rc.xp || 0,
                  isPremium: !!rc.isPremium,
                }
              : null,
            status: r.status,
            createdAt: r.createdAt || new Date(),
          };
        })
        .filter(Boolean);

      return res.json({ received, sent });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a friend
// @route   DELETE /api/social/friends/:friendId
export const removeFriend = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({ message: 'Invalid friend ID format' });
      }

      await FriendRequest.deleteMany({
        $or: [
          { senderId: req.user._id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user._id },
        ],
        status: 'accepted',
      });
    } else {
      if (inMemoryDB.friendRequests) {
        inMemoryDB.friendRequests = inMemoryDB.friendRequests.filter(
          (r) =>
            !(
              ((r.senderId === currentUserIdStr && r.receiverId === friendId) ||
                (r.senderId === friendId && r.receiverId === currentUserIdStr)) &&
              r.status === 'accepted'
            )
        );
      }
    }
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Weekly XP Leaderboard (Global - Excludes blocked users)
// @route   GET /api/social/leaderboard
export const getWeeklyLeaderboard = async (req, res) => {
  try {
    if (req.query.type === 'friends') {
      return getFriendsLeaderboard(req, res);
    }

    const currentUserIdStr = (req.user._id || req.user.id).toString();

    let allUsers = [];
    const weeklyXpMap = {};

    if (isMongoConnected()) {
      allUsers = await User.find({ status: { $ne: 'blocked' } }).select('name avatar level xp isPremium');

      // Monday 00:00:00 UTC start of the week reset
      const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });

      const weeklyXpAgg = await XPTransaction.aggregate([
        { $match: { createdAt: { $gte: startOfWeekDate } } },
        { $group: { _id: '$userId', weeklyXP: { $sum: '$amount' } } },
      ]);

      weeklyXpAgg.forEach((item) => {
        weeklyXpMap[item._id.toString()] = item.weeklyXP;
      });
    } else {
      allUsers = (inMemoryDB.users || []).filter((u) => u.status !== 'blocked');
    }

    const leaderboard = allUsers.map((u) => {
      const uId = (u._id || u.id).toString();
      const isCurrent = uId === currentUserIdStr;

      const totalXP = isCurrent ? (req.user.xp ?? u.xp ?? 0) : (u.xp ?? 0);
      const level = isCurrent ? (req.user.level ?? u.level ?? 1) : (u.level ?? 1);
      const weeklyXP = weeklyXpMap[uId] !== undefined ? weeklyXpMap[uId] : 0;

      return {
        userId: uId,
        name: isCurrent ? req.user.name : u.name,
        avatar: u.avatar || null,
        level,
        totalXP,
        weeklyXP,
        isPremium: isCurrent ? !!req.user.isPremium : !!u.isPremium,
        isCurrentUser: isCurrent,
      };
    });

    leaderboard.sort((a, b) => b.weeklyXP - a.weeklyXP || b.totalXP - a.totalXP);

    const rankedLeaderboard = leaderboard.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Weekly XP Friends Leaderboard (Only accepted friends + current user, excludes blocked users)
// @route   GET /api/social/leaderboard/friends
export const getFriendsLeaderboard = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    let userObjId = req.user._id;
    if (typeof userObjId === 'string' && mongoose.Types.ObjectId.isValid(userObjId)) {
      userObjId = new mongoose.Types.ObjectId(userObjId);
    }

    let friendUsers = [];
    const weeklyXpMap = {};

    if (isMongoConnected()) {
      // 1. Find all accepted friendships where current user is sender or receiver
      const acceptedRequests = await FriendRequest.find({
        $or: [
          { senderId: req.user._id },
          { receiverId: req.user._id },
          { senderId: userObjId },
          { receiverId: userObjId },
        ],
        status: 'accepted',
      });

      // 2. Collect unique friend IDs + include current user's ID
      const friendIdsSet = new Set();
      friendIdsSet.add(currentUserIdStr);

      acceptedRequests.forEach((r) => {
        const sId = r.senderId ? r.senderId.toString() : '';
        const rId = r.receiverId ? r.receiverId.toString() : '';
        if (sId === currentUserIdStr && rId) friendIdsSet.add(rId);
        else if (rId === currentUserIdStr && sId) friendIdsSet.add(sId);
      });

      const friendObjIds = Array.from(friendIdsSet)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      // 3. Query User documents only for these IDs, excluding blocked accounts
      friendUsers = await User.find({
        _id: { $in: friendObjIds },
        status: { $ne: 'blocked' },
      }).select('name avatar level xp isPremium');

      // 4. Aggregate Weekly XP for these users (Monday 00:00:00 UTC reset)
      const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });

      const weeklyXpAgg = await XPTransaction.aggregate([
        { $match: { userId: { $in: friendObjIds }, createdAt: { $gte: startOfWeekDate } } },
        { $group: { _id: '$userId', weeklyXP: { $sum: '$amount' } } },
      ]);

      weeklyXpAgg.forEach((item) => {
        weeklyXpMap[item._id.toString()] = item.weeklyXP;
      });
    } else {
      const accepted = (inMemoryDB.friendRequests || []).filter(
        (r) => (r.senderId === currentUserIdStr || r.receiverId === currentUserIdStr) && r.status === 'accepted'
      );
      const allowedIds = new Set([currentUserIdStr]);
      accepted.forEach((r) => {
        if (r.senderId === currentUserIdStr) allowedIds.add(r.receiverId.toString());
        else allowedIds.add(r.senderId.toString());
      });
      friendUsers = (inMemoryDB.users || []).filter(
        (u) => allowedIds.has((u._id || u.id).toString()) && u.status !== 'blocked'
      );
    }

    const leaderboard = friendUsers.map((u) => {
      const uId = (u._id || u.id).toString();
      const isCurrent = uId === currentUserIdStr;

      const totalXP = isCurrent ? (req.user.xp ?? u.xp ?? 0) : (u.xp ?? 0);
      const level = isCurrent ? (req.user.level ?? u.level ?? 1) : (u.level ?? 1);
      const weeklyXP = weeklyXpMap[uId] !== undefined ? weeklyXpMap[uId] : 0;

      return {
        userId: uId,
        name: isCurrent ? req.user.name : u.name,
        avatar: u.avatar || null,
        level,
        totalXP,
        weeklyXP,
        isPremium: isCurrent ? !!req.user.isPremium : !!u.isPremium,
        isCurrentUser: isCurrent,
      };
    });

    leaderboard.sort((a, b) => b.weeklyXP - a.weeklyXP || b.totalXP - a.totalXP);

    const rankedLeaderboard = leaderboard.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
