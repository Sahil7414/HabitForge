import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { Notification } from '../models/Notification.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { getNormalizedToday, formatNormalizedDate, isSameCompletionPeriod } from '../utils/dateUtils.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';
import { checkAndUpdateUserPremiumStatus, calculateNewExpiryDate } from '../utils/subscriptionUtils.js';
import { sendCancellationConfirmationEmail } from '../services/emailService.js';
import { getActiveStreak } from '../utils/gamification.js';

// @desc    Get consolidated Dashboard summary payload (User, Habits, Stats, Notifications)
// @route   GET /api/users/dashboard-summary
export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      const targetUser = user || req.user;
      const targetTz = targetUser.timezone || req.user?.timezone || 'UTC';
      const targetTodayStr = getNormalizedToday(targetTz);

      const [habits, totalCompletions, recentNotifications, todayLogs, recentXpTxs] = await Promise.all([
        Habit.find({ userId, isArchived: false }).sort({ createdAt: -1 }),
        HabitLog.countDocuments({ userId }),
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(10),
        HabitLog.find({ userId, completionDate: targetTodayStr }),
        XPTransaction.find({
          userId,
          createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        }),
      ]);

      const todayXP = recentXpTxs
        .filter((tx) => formatNormalizedDate(tx.createdAt, targetTz) === targetTodayStr)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(targetUser);

      const completedHabitIds = new Set(todayLogs.map((l) => l.habitId.toString()));
      const activeHabits = habits.filter((h) => h.isActive !== false && !h.isPaused);
      const habitsWithStatus = habits.map((h) => {
        const obj = h.toObject();
        const idStr = (obj._id || obj.id).toString();
        obj.id = idStr;
        obj.isActive = obj.isActive !== false;
        obj.currentStreak = getActiveStreak(obj, targetTodayStr);
        obj.completedToday =
          obj.lastCompletedDate === targetTodayStr ||
          completedHabitIds.has(idStr);
        return obj;
      });

      const completedTodayCount = habitsWithStatus.filter((h) => h.completedToday && !h.isArchived).length;
      const currentStreak = Math.max(0, ...habitsWithStatus.map((h) => h.currentStreak || 0));
      const longestStreak = Math.max(0, ...habitsWithStatus.map((h) => h.longestStreak || 0));

      return res.json({
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          role: targetUser.role || (targetUser.email?.toLowerCase() === 'sahiljadhav7414@gmail.com' ? 'admin' : 'user'),
          status: targetUser.status || 'active',
          xp: targetUser.xp,
          todayXP,
          level: targetUser.level,
          badges: targetUser.badges,
          isPremium,
          premiumExpiresAt,
          timezone: targetUser.timezone || 'UTC',
          theme: targetUser.theme || 'dark',
          notificationPreferences: targetUser.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
        habits: habitsWithStatus,
        stats: {
          totalCompletions,
          currentStreak,
          longestStreak,
          activeHabitsCount: activeHabits.length,
          completedTodayCount,
          todayXP,
        },
        notifications: recentNotifications,
      });
    } else {
      // Standalone mode in-memory summary
      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(req.user);
      const targetTz = req.user.timezone || userTimezone;
      const targetTodayStr = getNormalizedToday(targetTz);

      const todayXP = (inMemoryDB.xpTransactions || [])
        .filter((tx) => tx.userId === userId.toString() && formatNormalizedDate(tx.createdAt, targetTz) === targetTodayStr)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const userHabits = inMemoryDB.habits.filter((h) => h.userId === userId.toString() && !h.isArchived);
      const todayLogs = inMemoryDB.habitLogs.filter((l) => l.userId === userId.toString() && l.completionDate === targetTodayStr);
      const completedHabitIds = new Set(todayLogs.map((l) => l.habitId.toString()));

      const habitsWithStatus = userHabits.map((h) => {
        const idStr = (h._id || h.id).toString();
        return {
          ...h,
          id: idStr,
          currentStreak: getActiveStreak(h, todayStr),
          completedToday: h.lastCompletedDate === todayStr || completedHabitIds.has(idStr),
        };
      });

      const userNotifs = inMemoryDB.notifications.filter((n) => n.userId === userId.toString());

      return res.json({
        user: {
          id: req.user._id || req.user.id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar || null,
          xp: req.user.xp || 0,
          level: req.user.level || 1,
          badges: req.user.badges || [],
          isPremium,
          premiumExpiresAt,
          timezone: req.user.timezone || 'UTC',
          theme: req.user.theme || 'dark',
          notificationPreferences: req.user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
        habits: habitsWithStatus,
        stats: {
          totalCompletions: 0,
          currentStreak: Math.max(0, ...habitsWithStatus.map((h) => h.currentStreak || 0)),
          longestStreak: Math.max(0, ...userHabits.map((h) => h.longestStreak || 0)),
          activeHabitsCount: userHabits.filter((h) => h.isActive !== false).length,
          completedTodayCount: habitsWithStatus.filter((h) => h.completedToday).length,
        },
        notifications: userNotifs,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get user profile and badges
// @route   GET /api/users/profile
export const getUserProfile = async (req, res) => {
  try {
    const todayStr = getNormalizedToday(req.user?.timezone || 'UTC');
    const userId = req.user._id || req.user.id;
    if (isMongoConnected()) {
      const user = await User.findById(userId);
      const userTz = user?.timezone || req.user?.timezone || 'UTC';
      const userTodayStr = getNormalizedToday(userTz);

      const [habits, totalCompletions, recentXpTxs] = await Promise.all([
        Habit.find({ userId }),
        HabitLog.countDocuments({ userId }),
        XPTransaction.find({
          userId,
          createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        }),
      ]);

      const todayXP = recentXpTxs
        .filter((tx) => formatNormalizedDate(tx.createdAt, userTz) === userTodayStr)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(user);

      const currentStreak = Math.max(0, ...habits.map((h) => getActiveStreak(h, userTodayStr)));
      const longestStreak = Math.max(0, ...habits.map((h) => h.longestStreak || 0));

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role || (user.email?.toLowerCase() === 'sahiljadhav7414@gmail.com' ? 'admin' : 'user'),
          status: user.status || 'active',
          xp: user.xp,
          todayXP,
          level: user.level,
          badges: user.badges,
          isPremium,
          premiumExpiresAt,
          timezone: user.timezone || 'UTC',
          theme: user.theme || 'dark',
          notificationPreferences: user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
          createdAt: user.createdAt,
        },
        stats: {
          totalCompletions,
          currentStreak,
          longestStreak,
          activeHabitsCount: habits.filter((h) => h.isActive !== false && !h.isArchived).length,
          todayXP,
        },
      });
    } else {
      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(req.user);
      const userTz = req.user?.timezone || 'UTC';
      const userTodayStr = getNormalizedToday(userTz);

      const todayXP = (inMemoryDB.xpTransactions || [])
        .filter((tx) => tx.userId === userId.toString() && formatNormalizedDate(tx.createdAt, userTz) === userTodayStr)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return res.json({
        user: {
          id: userId,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar || null,
          xp: req.user.xp || 0,
          level: req.user.level || 1,
          badges: req.user.badges || [],
          isPremium,
          premiumExpiresAt,
          timezone: req.user.timezone || 'UTC',
          theme: req.user.theme || 'dark',
          notificationPreferences: req.user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
        stats: {
          totalCompletions: 0,
          currentStreak: 0,
          longestStreak: 0,
          activeHabitsCount: 0,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Update user profile & preferences (theme, timezone, notificationPreferences)
// @route   PUT /api/users/profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const userIdStr = userId.toString();
    const { name, avatar, timezone, theme, notificationPreferences } = req.body;

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      if (user) {
        if (name !== undefined) user.name = name;
        if (avatar !== undefined) user.avatar = avatar;
        if (timezone !== undefined) user.timezone = timezone;
        if (theme !== undefined) user.theme = theme;
        if (notificationPreferences !== undefined) {
          user.notificationPreferences = {
            ...user.notificationPreferences,
            ...notificationPreferences,
          };
        }

        const updatedUser = await user.save();

        await Notification.create({
          userId: user._id,
          type: 'system',
          title: 'Settings Updated ⚙️',
          message: 'Your account preferences and notification settings have been updated.',
        });

        return res.json({
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            role: updatedUser.role || 'user',
            status: updatedUser.status || 'active',
            xp: updatedUser.xp,
            level: updatedUser.level,
            badges: updatedUser.badges,
            isPremium: updatedUser.isPremium,
            timezone: updatedUser.timezone,
            theme: updatedUser.theme,
            notificationPreferences: updatedUser.notificationPreferences,
          },
        });
      }
    }

    // In-memory update
    if (name !== undefined) req.user.name = name;
    if (timezone !== undefined) req.user.timezone = timezone;
    if (theme !== undefined) req.user.theme = theme;
    if (notificationPreferences !== undefined) {
      req.user.notificationPreferences = {
        ...req.user.notificationPreferences,
        ...notificationPreferences,
      };
    }

    inMemoryDB.notifications.unshift({
      _id: `notif_${Date.now()}`,
      id: `notif_${Date.now()}`,
      userId: userIdStr,
      type: 'system',
      title: 'Settings Updated ⚙️',
      message: 'Your account preferences and notification settings have been updated.',
      read: false,
      createdAt: new Date(),
    });

    return res.json({
      user: {
        id: userId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || null,
        xp: req.user.xp || 0,
        level: req.user.level || 1,
        badges: req.user.badges || [],
        isPremium: !!req.user.isPremium,
        timezone: req.user.timezone || 'UTC',
        theme: req.user.theme || 'dark',
        notificationPreferences: req.user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upgrade user to Premium
// @route   POST /api/users/upgrade-premium
export const upgradeToPremium = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const now = new Date();
    const newExpiresAt = calculateNewExpiryDate();

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      if (user) {
        user.isPremium = true;
        user.isCancelled = false;
        user.cancelledAt = null;
        user.premiumSince = now;
        user.premiumExpiresAt = newExpiresAt;
        await user.save();
      }
    }
    req.user.isPremium = true;
    req.user.isCancelled = false;
    req.user.cancelledAt = null;
    req.user.premiumSince = now;
    req.user.premiumExpiresAt = newExpiresAt;

    res.json({
      message: 'Successfully upgraded to HabitForge Premium!',
      isPremium: true,
      user: {
        id: userId,
        name: req.user.name,
        email: req.user.email,
        xp: req.user.xp || 0,
        level: req.user.level || 1,
        isPremium: true,
        isCancelled: false,
        premiumExpiresAt: newExpiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel user Premium membership (turns off auto-renewal, keeps access until expiry)
// @route   POST /api/users/cancel-premium
export const cancelPremium = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let targetUser = req.user;

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      if (user) {
        const hasFutureExpiry = user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();
        user.isCancelled = true;
        user.cancelledAt = new Date();
        if (!hasFutureExpiry) {
          user.isPremium = false;
          user.premiumExpiresAt = null;
        }
        await user.save();
        targetUser = user;
      }
    } else {
      const hasFutureExpiry = req.user.premiumExpiresAt && new Date(req.user.premiumExpiresAt) > new Date();
      req.user.isCancelled = true;
      req.user.cancelledAt = new Date();
      if (!hasFutureExpiry) {
        req.user.isPremium = false;
        req.user.premiumExpiresAt = null;
      }
    }

    sendCancellationConfirmationEmail({ user: targetUser }).catch((emailErr) => {
      console.error('[Cancellation Email Non-Blocking Error]', emailErr.message);
    });

    res.json({
      message: targetUser.isPremium
        ? 'Membership cancelled. Premium access remains active until your expiry date.'
        : 'HabitForge Premium membership cancelled successfully.',
      isPremium: targetUser.isPremium,
      isCancelled: true,
      user: {
        id: userId,
        name: targetUser.name,
        email: targetUser.email,
        xp: targetUser.xp || 0,
        level: targetUser.level || 1,
        isPremium: targetUser.isPremium,
        premiumExpiresAt: targetUser.premiumExpiresAt,
        isCancelled: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
