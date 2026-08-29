import { User } from '../models/User.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { Notification } from '../models/Notification.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

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
        .select('name email avatar level xp isPremium')
        .sort({ xp: -1 })
        .limit(10);
      return res.json(users);
    } else {
      // Standalone mode user search
      const q = query.toLowerCase();
      const users = inMemoryDB.users
        .filter((u) => u._id !== currentUserIdStr && u.id !== currentUserIdStr)
        .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        .map((u) => ({
          _id: u._id,
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || null,
          level: u.level || 1,
          xp: u.xp || 0,
          isPremium: !!u.isPremium,
        }));
      return res.json(users);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get suggested friends (excluding self, existing friends, and pending requests)
// @route   GET /api/social/friends/suggested
export const getSuggestedFriends = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const existingReqs = await FriendRequest.find({
        $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      });

      const excludedIds = [req.user._id];
      existingReqs.forEach((r) => {
        const sId = r.senderId.toString();
        const rId = r.receiverId.toString();
        if (sId === currentUserIdStr) excludedIds.push(r.receiverId);
        else excludedIds.push(r.senderId);
      });

      const suggestedUsers = await User.find({ _id: { $nin: excludedIds } })
        .select('name email avatar level xp isPremium')
        .sort({ xp: -1 })
        .limit(10);

      return res.json(suggestedUsers);
    } else {
      const userReqs = (inMemoryDB.friendRequests || []).filter(
        (r) => r.senderId === currentUserIdStr || r.receiverId === currentUserIdStr
      );
      const excludedIds = new Set([currentUserIdStr]);
      userReqs.forEach((r) => {
        if (r.senderId === currentUserIdStr) excludedIds.add(r.receiverId);
        else excludedIds.add(r.senderId);
      });

      const suggestedUsers = inMemoryDB.users
        .filter((u) => !excludedIds.has((u._id || u.id).toString()))
        .map((u) => ({
          _id: u._id || u.id,
          id: u._id || u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || null,
          level: u.level || 1,
          xp: u.xp || 0,
          isPremium: !!u.isPremium,
        }));

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
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: 'User not found' });
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
          return res.status(400).json({ message: 'A pending friend request already exists' });
        }
        existing.senderId = req.user._id;
        existing.receiverId = receiverId;
        existing.status = 'pending';
        await existing.save();
      } else {
        await FriendRequest.create({
          senderId: req.user._id,
          receiverId,
          status: 'pending',
        });
      }

      await Notification.create({
        userId: receiver._id,
        type: 'friend_request',
        title: 'New Friend Request 🤝',
        message: `${req.user.name} sent you a friend request.`,
      });
    } else {
      // Standalone mode
      if (!inMemoryDB.friendRequests) inMemoryDB.friendRequests = [];
      if (!inMemoryDB.notifications) inMemoryDB.notifications = [];

      const existingIdx = inMemoryDB.friendRequests.findIndex(
        (r) => (r.senderId === currentUserIdStr && r.receiverId === receiverId) || (r.senderId === receiverId && r.receiverId === currentUserIdStr)
      );

      if (existingIdx !== -1) {
        const existing = inMemoryDB.friendRequests[existingIdx];
        if (existing.status === 'accepted') return res.status(400).json({ message: 'You are already friends with this user' });
        if (existing.status === 'pending') return res.status(400).json({ message: 'A pending friend request already exists' });
        existing.senderId = currentUserIdStr;
        existing.receiverId = receiverId;
        existing.status = 'pending';
      } else {
        inMemoryDB.friendRequests.push({
          _id: `freq_${Date.now()}`,
          id: `freq_${Date.now()}`,
          senderId: currentUserIdStr,
          receiverId,
          status: 'pending',
          createdAt: new Date(),
        });
      }

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
    const { action } = req.body;
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accepted or rejected' });
    }

    if (isMongoConnected()) {
      const friendReq = await FriendRequest.findById(req.params.requestId);
      if (!friendReq) {
        return res.status(404).json({ message: 'Friend request not found' });
      }
      if (friendReq.receiverId.toString() !== (req.user._id || req.user.id).toString()) {
        return res.status(403).json({ message: 'Not authorized to respond to this friend request' });
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
      const reqId = req.params.requestId;
      const friendReq = inMemoryDB.friendRequests.find((r) => r._id === reqId || r.id === reqId);
      if (friendReq) {
        friendReq.status = action;
        if (action === 'accepted') {
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
    if (isMongoConnected()) {
      await FriendRequest.deleteOne({ _id: requestId, senderId: req.user._id });
    } else {
      if (inMemoryDB.friendRequests) {
        inMemoryDB.friendRequests = inMemoryDB.friendRequests.filter((r) => r._id !== requestId && r.id !== requestId);
      }
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
      }).populate('senderId receiverId', 'name email avatar level xp isPremium');

      const friends = acceptedRequests.map((r) => {
        const friendObj = r.senderId._id.toString() === req.user._id.toString() ? r.receiverId : r.senderId;
        return {
          id: friendObj._id,
          name: friendObj.name,
          email: friendObj.email,
          avatar: friendObj.avatar,
          level: friendObj.level,
          xp: friendObj.xp,
          isPremium: friendObj.isPremium,
          requestId: r._id,
        };
      });

      return res.json(friends);
    } else {
      const accepted = (inMemoryDB.friendRequests || []).filter(
        (r) => (r.senderId === currentUserIdStr || r.receiverId === currentUserIdStr) && r.status === 'accepted'
      );
      const friends = accepted.map((r) => {
        const friendId = r.senderId === currentUserIdStr ? r.receiverId : r.senderId;
        const u = inMemoryDB.users.find((user) => (user._id || user.id).toString() === friendId);
        return {
          id: friendId,
          name: u ? u.name : 'Friend',
          email: u ? u.email : '',
          avatar: u ? u.avatar : null,
          level: u ? u.level : 1,
          xp: u ? u.xp : 0,
          isPremium: u ? !!u.isPremium : false,
          requestId: r._id || r.id,
        };
      });
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
      }).populate('senderId', 'name email avatar level xp');

      const sent = await FriendRequest.find({
        senderId: req.user._id,
        status: 'pending',
      }).populate('receiverId', 'name email avatar level xp');

      return res.json({
        received: received.map((r) => ({ id: r._id, sender: r.senderId, createdAt: r.createdAt })),
        sent: sent.map((r) => ({ id: r._id, receiver: r.receiverId, createdAt: r.createdAt })),
      });
    } else {
      const allReqs = inMemoryDB.friendRequests || [];
      const received = allReqs
        .filter((r) => r.receiverId === currentUserIdStr && r.status === 'pending')
        .map((r) => {
          const sender = inMemoryDB.users.find((u) => (u._id || u.id).toString() === r.senderId);
          return { id: r._id || r.id, sender, createdAt: r.createdAt };
        });

      const sent = allReqs
        .filter((r) => r.senderId === currentUserIdStr && r.status === 'pending')
        .map((r) => {
          const receiver = inMemoryDB.users.find((u) => (u._id || u.id).toString() === r.receiverId);
          return { id: r._id || r.id, receiver, createdAt: r.createdAt };
        });

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
      await FriendRequest.deleteMany({
        $or: [
          { senderId: req.user._id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user._id },
        ],
      });
    } else {
      if (inMemoryDB.friendRequests) {
        inMemoryDB.friendRequests = inMemoryDB.friendRequests.filter(
          (r) =>
            !(
              (r.senderId === currentUserIdStr && r.receiverId === friendId) ||
              (r.senderId === friendId && r.receiverId === currentUserIdStr)
            )
        );
      }
    }
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Weekly XP Leaderboard
// @route   GET /api/social/leaderboard
export const getWeeklyLeaderboard = async (req, res) => {
  try {
    const currentUserIdStr = (req.user._id || req.user.id).toString();

    let allUsers = [];
    if (isMongoConnected()) {
      allUsers = await User.find({}).select('name avatar level xp isPremium');
    } else {
      allUsers = inMemoryDB.users;
    }

    const leaderboard = allUsers.map((u) => {
      const uId = (u._id || u.id).toString();
      const isCurrent = uId === currentUserIdStr;
      
      const totalXP = isCurrent ? (req.user.xp ?? u.xp ?? 0) : (u.xp ?? 0);
      const level = isCurrent ? (req.user.level ?? u.level ?? 1) : (u.level ?? 1);
      const weeklyXP = totalXP;

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
