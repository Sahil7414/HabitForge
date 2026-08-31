import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

const MASTER_ADMIN_EMAIL = 'sahiljadhav7414@gmail.com';

// @desc    Get aggregated platform metrics for Admin Dashboard
// @route   GET /api/admin/overview
export const getAdminOverview = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const [
        totalUsers,
        activeUsers,
        blockedUsers,
        premiumUsers,
        totalHabits,
        totalCompletions,
        totalXpAgg,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ status: { $ne: 'blocked' } }),
        User.countDocuments({ status: 'blocked' }),
        User.countDocuments({ isPremium: true, status: { $ne: 'blocked' } }),
        Habit.countDocuments({}),
        HabitLog.countDocuments({}),
        User.aggregate([{ $group: { _id: null, totalXP: { $sum: '$xp' } } }]),
      ]);

      const totalPlatformXP = totalXpAgg[0]?.totalXP || 0;

      return res.json({
        metrics: {
          totalUsers,
          activeUsers,
          blockedUsers,
          premiumUsers,
          totalHabits,
          totalCompletions,
          totalPlatformXP,
        },
        systemStatus: {
          database: 'MongoDB Atlas (Connected)',
          environment: process.env.NODE_ENV || 'development',
          masterAdmin: MASTER_ADMIN_EMAIL,
          serverUptimeSeconds: Math.floor(process.uptime()),
        },
      });
    } else {
      const users = inMemoryDB.users || [];
      const habits = inMemoryDB.habits || [];
      const logs = inMemoryDB.habitLogs || [];

      return res.json({
        metrics: {
          totalUsers: users.length,
          activeUsers: users.filter((u) => u.status !== 'blocked').length,
          blockedUsers: users.filter((u) => u.status === 'blocked').length,
          premiumUsers: users.filter((u) => u.isPremium && u.status !== 'blocked').length,
          totalHabits: habits.length,
          totalCompletions: logs.length,
          totalPlatformXP: users.reduce((sum, u) => sum + (u.xp || 0), 0),
        },
        systemStatus: {
          database: 'In-Memory DB (Fallback)',
          environment: process.env.NODE_ENV || 'development',
          masterAdmin: MASTER_ADMIN_EMAIL,
          serverUptimeSeconds: Math.floor(process.uptime()),
        },
      });
    }
  } catch (error) {
    console.error('[Admin Overview Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registered users with search, role/status filters
// @route   GET /api/admin/users
export const getAllUsersAdmin = async (req, res) => {
  try {
    const { q, role, status } = req.query;

    if (isMongoConnected()) {
      const filter = {};

      if (q && q.trim()) {
        const queryRegex = new RegExp(q.trim(), 'i');
        filter.$or = [{ name: queryRegex }, { email: queryRegex }];
      }

      if (role && role !== 'all') {
        filter.role = role;
      }

      if (status && status !== 'all') {
        filter.status = status;
      }

      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      // Retrieve habit counts per user
      const userIds = users.map((u) => u._id);
      const habitsAgg = await Habit.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]);

      const habitsMap = {};
      habitsAgg.forEach((h) => {
        habitsMap[h._id.toString()] = h.count;
      });

      const formattedUsers = users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatar: u.avatar || null,
        role: u.role || (u.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? 'admin' : 'user'),
        status: u.status || 'active',
        isPremium: !!u.isPremium,
        level: u.level || 1,
        xp: u.xp || 0,
        badgesCount: u.badges?.length || 0,
        habitsCount: habitsMap[u._id.toString()] || 0,
        authProvider: u.authProvider || 'local',
        createdAt: u.createdAt,
      }));

      return res.json({ users: formattedUsers });
    } else {
      let users = inMemoryDB.users || [];

      if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        );
      }

      if (role && role !== 'all') {
        users = users.filter((u) => u.role === role);
      }

      if (status && status !== 'all') {
        users = users.filter((u) => u.status === status);
      }

      const formattedUsers = users.map((u) => ({
        id: (u._id || u.id).toString(),
        name: u.name,
        email: u.email,
        avatar: u.avatar || null,
        role: u.role || (u.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? 'admin' : 'user'),
        status: u.status || 'active',
        isPremium: !!u.isPremium,
        level: u.level || 1,
        xp: u.xp || 0,
        badgesCount: u.badges?.length || 0,
        habitsCount: (inMemoryDB.habits || []).filter((h) => h.userId === (u._id || u.id).toString()).length,
        authProvider: u.authProvider || 'local',
        createdAt: u.createdAt || new Date(),
      }));

      return res.json({ users: formattedUsers });
    }
  } catch (error) {
    console.error('[Admin Get Users Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get detailed user profile for Admin Inspection
// @route   GET /api/admin/users/:id
export const getUserDetailsAdmin = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (isMongoConnected()) {
      const user = await User.findById(targetUserId).select('-password').lean();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const [habits, totalCompletions, xpTransactionsCount, friendsCount] = await Promise.all([
        Habit.find({ userId: targetUserId }).sort({ createdAt: -1 }).lean(),
        HabitLog.countDocuments({ userId: targetUserId }),
        XPTransaction.countDocuments({ userId: targetUserId }),
        FriendRequest.countDocuments({
          $or: [{ senderId: targetUserId }, { receiverId: targetUserId }],
          status: 'accepted',
        }),
      ]);

      return res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          role: user.role || (user.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? 'admin' : 'user'),
          status: user.status || 'active',
          isPremium: !!user.isPremium,
          premiumSince: user.premiumSince,
          premiumExpiresAt: user.premiumExpiresAt,
          level: user.level || 1,
          xp: user.xp || 0,
          badges: user.badges || [],
          timezone: user.timezone || 'UTC',
          theme: user.theme || 'dark',
          authProvider: user.authProvider || 'local',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        stats: {
          totalHabits: habits.length,
          activeHabits: habits.filter((h) => !h.isArchived && !h.isPaused).length,
          totalCompletions,
          xpTransactionsCount,
          friendsCount,
        },
        habits: habits.map((h) => ({
          id: h._id.toString(),
          title: h.title,
          category: h.category,
          frequency: h.frequency,
          icon: h.icon,
          color: h.color,
          currentStreak: h.currentStreak || 0,
          longestStreak: h.longestStreak || 0,
          totalCompletions: h.totalCompletions || 0,
          isArchived: !!h.isArchived,
          isPaused: !!h.isPaused,
          createdAt: h.createdAt,
        })),
      });
    } else {
      const user = (inMemoryDB.users || []).find((u) => (u._id || u.id).toString() === targetUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userHabits = (inMemoryDB.habits || []).filter((h) => h.userId === targetUserId);
      const userLogs = (inMemoryDB.habitLogs || []).filter((l) => l.userId === targetUserId);
      const userFriends = (inMemoryDB.friendRequests || []).filter(
        (r) => (r.senderId === targetUserId || r.receiverId === targetUserId) && r.status === 'accepted'
      );

      return res.json({
        user: {
          id: (user._id || user.id).toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          role: user.role || (user.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? 'admin' : 'user'),
          status: user.status || 'active',
          isPremium: !!user.isPremium,
          level: user.level || 1,
          xp: user.xp || 0,
          badges: user.badges || [],
          timezone: user.timezone || 'UTC',
          theme: user.theme || 'dark',
          authProvider: user.authProvider || 'local',
          createdAt: user.createdAt || new Date(),
        },
        stats: {
          totalHabits: userHabits.length,
          activeHabits: userHabits.filter((h) => !h.isArchived).length,
          totalCompletions: userLogs.length,
          xpTransactionsCount: 0,
          friendsCount: userFriends.length,
        },
        habits: userHabits,
      });
    }
  } catch (error) {
    console.error('[Admin Get User Details Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status (active / blocked)
// @route   PUT /api/admin/users/:id/status
export const updateUserStatusAdmin = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "active" or "blocked"' });
    }

    if (isMongoConnected()) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }

      // Safety: Cannot block or alter the primary Master Admin
      if (targetUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ message: 'Cannot modify status of the Master Administrator' });
      }

      targetUser.status = status;
      await targetUser.save();

      return res.json({
        message: `User status updated to ${status}`,
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role || 'user',
          status: targetUser.status,
        },
      });
    } else {
      const targetUser = inMemoryDB.users.find((u) => (u._id || u.id).toString() === targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }

      if (targetUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ message: 'Cannot modify status of the Master Administrator' });
      }

      targetUser.status = status;

      return res.json({
        message: `User status updated to ${status}`,
        user: {
          id: (targetUser._id || targetUser.id).toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role || 'user',
          status: targetUser.status,
        },
      });
    }
  } catch (error) {
    console.error('[Admin Update User Status Error]', error);
    res.status(500).json({ message: error.message });
  }
};
