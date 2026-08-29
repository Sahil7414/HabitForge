import mongoose from 'mongoose';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { User } from '../models/User.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { Notification } from '../models/Notification.js';
import { getNormalizedToday } from '../utils/dateUtils.js';
import {
  calculateStreakUpdate,
  calculateLevel,
  evaluateBadges,
  getActiveStreak,
  XP_CONFIG,
} from '../utils/gamification.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

// @desc    Get user habits
// @route   GET /api/habits
export const getHabits = async (req, res) => {
  try {
    const todayStr = getNormalizedToday();
    const userIdStr = (req.user._id || req.user.id).toString();
    const { includeArchived } = req.query;

    if (isMongoConnected()) {
      const filter = { userId: req.user._id };
      if (includeArchived !== 'true') {
        filter.isArchived = { $ne: true };
      }

      const habits = await Habit.find(filter).sort({ createdAt: -1 });
      const todayLogs = await HabitLog.find({ userId: req.user._id, completionDate: todayStr });
      const completedHabitIds = new Set(todayLogs.map((l) => l.habitId.toString()));

      const habitsWithStatus = habits.map((h) => {
        const habitObj = h.toObject();
        const idStr = (habitObj._id || habitObj.id).toString();
        habitObj.id = idStr;
        habitObj.isActive = habitObj.isActive !== false;
        habitObj.currentStreak = getActiveStreak(habitObj, todayStr);
        habitObj.completedToday = habitObj.lastCompletedDate === todayStr || completedHabitIds.has(idStr);
        return habitObj;
      });

      return res.json(habitsWithStatus);
    } else {
      // Standalone mode in-memory habits
      const todayLogs = inMemoryDB.habitLogs.filter((l) => l.userId === userIdStr && l.completionDate === todayStr);
      const completedHabitIds = new Set(todayLogs.map((l) => l.habitId.toString()));

      const habits = inMemoryDB.habits
        .filter((h) => h.userId === userIdStr)
        .filter((h) => includeArchived === 'true' || !h.isArchived)
        .map((h) => {
          const idStr = (h._id || h.id).toString();
          return {
            ...h,
            id: idStr,
            currentStreak: getActiveStreak(h, todayStr),
            completedToday: h.lastCompletedDate === todayStr || completedHabitIds.has(idStr),
          };
        });
      return res.json(habits);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a habit
// @route   POST /api/habits
export const createHabit = async (req, res) => {
  try {
    const { title, description, category, frequency, icon, color } = req.body;
    const userIdStr = (req.user._id || req.user.id).toString();

    if (!title) {
      return res.status(400).json({ message: 'Habit title is required' });
    }

    const isPremiumActive =
      req.user &&
      req.user.isPremium &&
      (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date());

    if (isMongoConnected()) {
      // Free User Limit Enforcer: Max 5 active habits
      if (!isPremiumActive) {
        const activeCount = await Habit.countDocuments({
          userId: req.user._id,
          isArchived: false,
        });

        if (activeCount >= 5) {
          return res.status(403).json({
            error: 'PREMIUM_REQUIRED',
            message: 'Free tier is limited to 5 habits. Upgrade to HabitForge Premium for unlimited habits!',
          });
        }
      }

      const habit = await Habit.create({
        userId: req.user._id,
        title,
        description: description || '',
        category: category || 'Health',
        frequency: frequency || 'DAILY',
        icon: icon || '🏃',
        color: color || '#d0bcff',
        isArchived: false,
        isPaused: false,
        isActive: true,
      });

      await Notification.create({
        userId: req.user._id,
        type: 'system',
        title: 'New Habit Created 🎯',
        message: `Created "${title}". Keep up the daily consistency!`,
      });

      return res.status(201).json(habit);
    } else {
      // Standalone mode in-memory habit creation
      const userHabits = inMemoryDB.habits.filter((h) => h.userId === userIdStr && !h.isArchived);
      if (!isPremiumActive && userHabits.length >= 5) {
        return res.status(403).json({
          error: 'PREMIUM_REQUIRED',
          message: 'Free tier is limited to 5 habits. Upgrade to HabitForge Premium for unlimited habits!',
        });
      }


      const newHabit = {
        _id: `habit_${Date.now()}`,
        id: `habit_${Date.now()}`,
        userId: userIdStr,
        title,
        description: description || '',
        category: category || 'Health',
        frequency: frequency || 'DAILY',
        icon: icon || '🏃',
        color: color || '#d0bcff',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        isActive: true,
        isPaused: false,
        isArchived: false,
        lastCompletedDate: null,
        createdAt: new Date(),
      };

      inMemoryDB.habits.unshift(newHabit);
      inMemoryDB.notifications.unshift({
        _id: `notif_${Date.now()}`,
        id: `notif_${Date.now()}`,
        userId: userIdStr,
        type: 'system',
        title: 'New Habit Created 🎯',
        message: `Created "${title}". Keep up the daily consistency!`,
        read: false,
        createdAt: new Date(),
      });

      return res.status(201).json(newHabit);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a habit
// @route   PUT /api/habits/:id
export const updateHabit = async (req, res) => {
  try {
    const habitId = req.params.id;
    const userIdStr = (req.user._id || req.user.id).toString();
    const { title, description, category, frequency, icon, color, isActive, isArchived, isPaused } = req.body;

    if (isMongoConnected()) {
      let habit = null;
      if (mongoose.Types.ObjectId.isValid(habitId)) {
        habit = await Habit.findById(habitId);
      }
      if (!habit) {
        habit = await Habit.findOne({ userId: req.user._id, title: new RegExp(habitId, 'i') });
      }
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }
      if (habit.userId.toString() !== userIdStr) {
        return res.status(403).json({ message: 'Not authorized to access this habit' });
      }

      if (title !== undefined) habit.title = title;
      if (description !== undefined) habit.description = description;
      if (category !== undefined) habit.category = category;
      if (frequency !== undefined) habit.frequency = frequency;
      if (icon !== undefined) habit.icon = icon;
      if (color !== undefined) habit.color = color;
      if (isActive !== undefined) habit.isActive = isActive;
      if (isArchived !== undefined) habit.isArchived = isArchived;
      if (isPaused !== undefined) habit.isPaused = isPaused;

      const updatedHabit = await habit.save();
      return res.json(updatedHabit);
    } else {
      const habitIndex = inMemoryDB.habits.findIndex((h) => h._id === habitId || h.id === habitId);
      if (habitIndex === -1) {
        return res.status(404).json({ message: 'Habit not found' });
      }
      const target = inMemoryDB.habits[habitIndex];
      if (target.userId !== userIdStr) {
        return res.status(403).json({ message: 'Not authorized to access this habit' });
      }

      const updated = {
        ...target,
        title: title !== undefined ? title : target.title,
        description: description !== undefined ? description : target.description,
        category: category !== undefined ? category : target.category,
        frequency: frequency !== undefined ? frequency : target.frequency,
        icon: icon !== undefined ? icon : target.icon,
        color: color !== undefined ? color : target.color,
        isActive: isActive !== undefined ? isActive : target.isActive,
        isArchived: isArchived !== undefined ? isArchived : target.isArchived,
        isPaused: isPaused !== undefined ? isPaused : target.isPaused,
      };
      inMemoryDB.habits[habitIndex] = updated;
      return res.json(updated);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a habit
// @route   DELETE /api/habits/:id
export const deleteHabit = async (req, res) => {
  try {
    const habitId = req.params.id;
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      let habit = null;
      if (mongoose.Types.ObjectId.isValid(habitId)) {
        habit = await Habit.findById(habitId);
      }
      if (!habit) {
        habit = await Habit.findOne({ userId: req.user._id, title: new RegExp(habitId, 'i') });
      }
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }
      if (habit.userId.toString() !== userIdStr) {
        return res.status(403).json({ message: 'Not authorized to access this habit' });
      }

      await Habit.deleteOne({ _id: habit._id });
      await HabitLog.deleteMany({ habitId: habit._id });
      return res.json({ message: 'Habit and completion history deleted successfully' });
    } else {
      inMemoryDB.habits = inMemoryDB.habits.filter((h) => h._id !== habitId && h.id !== habitId);
      inMemoryDB.habitLogs = inMemoryDB.habitLogs.filter((l) => l.habitId !== habitId);
      return res.json({ message: 'Habit deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check-in / Complete habit
// @route   POST /api/habits/:id/check-in
export const checkInHabit = async (req, res) => {
  try {
    const habitId = req.params.id;
    const userIdStr = (req.user._id || req.user.id).toString();
    const todayStr = getNormalizedToday();

    if (isMongoConnected()) {
      let habit = null;
      if (mongoose.Types.ObjectId.isValid(habitId)) {
        habit = await Habit.findById(habitId);
      }
      if (!habit) {
        habit = await Habit.findOne({ userId: req.user._id, title: new RegExp(habitId, 'i') });
      }
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }
      if (habit.userId.toString() !== userIdStr) {
        return res.status(403).json({ message: 'Not authorized to complete this habit' });
      }

      let streakUpdates;
      try {
        streakUpdates = calculateStreakUpdate(habit, todayStr);
      } catch (err) {
        if (err.message.startsWith('DUPLICATE_CHECKIN')) {
          return res.status(400).json({ message: 'Habit already completed for today' });
        }
        throw err;
      }

      const existingLog = await HabitLog.findOne({ habitId: habit._id, completionDate: todayStr });
      if (existingLog) {
        return res.status(400).json({ message: 'Habit already completed for today!' });
      }

      let habitLog;
      try {
        habitLog = await HabitLog.create({
          habitId: habit._id,
          userId: req.user._id,
          completionDate: todayStr,
          completedAt: new Date(),
        });
      } catch (dbErr) {
        if (dbErr.code === 11000) {
          return res.status(400).json({ message: 'Habit already completed for today!' });
        }
        throw dbErr;
      }

      habit.currentStreak = streakUpdates.currentStreak;
      habit.longestStreak = streakUpdates.longestStreak;
      habit.lastCompletedDate = streakUpdates.lastCompletedDate;
      habit.totalCompletions += 1;
      await habit.save();

      const user = await User.findById(req.user._id);
      let xpEarned = XP_CONFIG.BASE_COMPLETION;

      await XPTransaction.create({
        userId: user._id,
        amount: XP_CONFIG.BASE_COMPLETION,
        reason: 'HABIT_COMPLETION',
        sourceId: habit._id.toString(),
      });

      user.xp += xpEarned;
      const oldLevel = user.level;
      user.level = calculateLevel(user.xp);
      const leveledUp = user.level > oldLevel;

      if (leveledUp) {
        await Notification.create({
          userId: user._id,
          type: 'levelup',
          title: `Level ${user.level} Unlocked! ⭐`,
          message: `Congratulations! You leveled up to Level ${user.level}.`,
        });
      }

      const allUserHabits = await Habit.find({ userId: user._id });
      const totalUserCompletions = await HabitLog.countDocuments({ userId: user._id });
      const badgeEval = evaluateBadges(user, allUserHabits, totalUserCompletions);
      user.badges = badgeEval.updatedBadges;

      await user.save();

      const habitObj = habit.toObject();
      habitObj.completedToday = true;

      return res.json({
        message: 'Habit completed successfully!',
        xpEarned,
        leveledUp,
        newLevel: user.level,
        newlyUnlockedBadges: badgeEval.newlyUnlocked,
        habit: habitObj,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          xp: user.xp,
          level: user.level,
          badges: user.badges,
          isPremium: user.isPremium,
        },
        log: habitLog,
      });
    } else {
      // Standalone mode check-in
      const habit = inMemoryDB.habits.find((h) => h._id === habitId || h.id === habitId);
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }

      const newStreak = (habit.currentStreak || 0) + 1;
      habit.currentStreak = newStreak;
      habit.longestStreak = Math.max(newStreak, habit.longestStreak || 0);
      habit.totalCompletions = (habit.totalCompletions || 0) + 1;
      habit.lastCompletedDate = todayStr;

      req.user.xp = (req.user.xp || 0) + 10;
      req.user.level = calculateLevel(req.user.xp);

      inMemoryDB.habitLogs.push({
        userId: userIdStr,
        habitId: habit._id || habit.id,
        completionDate: todayStr,
        completedAt: new Date(),
      });

      return res.json({
        message: 'Habit completed successfully!',
        xpEarned: 10,
        leveledUp: false,
        newLevel: req.user.level,
        habit: { ...habit, completedToday: true },
        user: req.user,
      });
    }
  } catch (error) {
    if (error.code === 11000 || error.message?.includes('E11000')) {
      return res.status(400).json({ message: 'Habit already completed for today!' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get habit log history
// @route   GET /api/habits/:id/history
export const getHabitHistory = async (req, res) => {
  try {
    const habitId = req.params.id;
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const logs = await HabitLog.find({
        habitId,
        userId: req.user._id,
      }).sort({ completionDate: -1 });
      return res.json(logs);
    } else {
      const logs = inMemoryDB.habitLogs.filter(
        (l) => l.habitId === habitId && l.userId === userIdStr
      );
      return res.json(logs);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
