import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { format, subDays } from 'date-fns';
import { calculateLevel, evaluateBadges } from '../utils/gamification.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habitforge';

export const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed Engine] Connected to MongoDB database...');

    // Clear existing data
    await User.deleteMany({});
    await Habit.deleteMany({});
    await HabitLog.deleteMany({});

    console.log('[Seed Engine] Cleared old dataset.');

    // 1. Create Demo User
    const demoUser = await User.create({
      name: 'Alex Rivera',
      email: 'alex@habitforge.com',
      password: 'password123',
      xp: 1240,
      level: calculateLevel(1240),
      badges: ['first_step', 'consistency_starter', 'consistency_king', 'habit_master', 'xp_hunter'],
      isPremium: false,
    });

    console.log(`[Seed Engine] Created Demo User: ${demoUser.email} (Password: password123)`);

    // 2. Create 5 Demo Habits
    const habitsData = [
      {
        userId: demoUser._id,
        title: 'Morning Exercise',
        description: '30 min workout to start the day strong',
        frequency: 'DAILY',
        icon: '🏃',
        color: '#ffb95f',
        currentStreak: 14,
        longestStreak: 28,
        totalCompletions: 42,
        isActive: true,
        lastCompletedDate: format(new Date(), 'yyyy-MM-dd'),
      },
      {
        userId: demoUser._id,
        title: 'Reading — 20 Minutes',
        description: 'Technical books and articles',
        frequency: 'DAILY',
        icon: '📚',
        color: '#d0bcff',
        currentStreak: 5,
        longestStreak: 12,
        totalCompletions: 28,
        isActive: true,
        lastCompletedDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      },
      {
        userId: demoUser._id,
        title: 'Drink Water',
        description: '8 glasses throughout the day',
        frequency: 'DAILY',
        icon: '💧',
        color: '#adc6ff',
        currentStreak: 3,
        longestStreak: 10,
        totalCompletions: 18,
        isActive: true,
        lastCompletedDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      },
      {
        userId: demoUser._id,
        title: 'Practice Coding',
        description: 'LeetCode & side projects',
        frequency: 'DAILY',
        icon: '💻',
        color: '#10b981',
        currentStreak: 7,
        longestStreak: 30,
        totalCompletions: 34,
        isActive: true,
        lastCompletedDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      },
      {
        userId: demoUser._id,
        title: 'Meditation',
        description: '15 min mindfulness session',
        frequency: 'DAILY',
        icon: '🧘',
        color: '#f87171',
        currentStreak: 0,
        longestStreak: 8,
        totalCompletions: 10,
        isActive: false,
        lastCompletedDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      },
    ];

    const habits = await Habit.insertMany(habitsData);
    console.log(`[Seed Engine] Created ${habits.length} demo habits.`);

    // 3. Generate 90 Days of Habit Logs
    const logs = [];
    const today = new Date();

    habits.forEach((habit) => {
      // Create completions for the last 90 days with realistic completion probability
      const completionProbability = habit.title.includes('Exercise')
        ? 0.7
        : habit.title.includes('Coding')
        ? 0.65
        : habit.title.includes('Reading')
        ? 0.6
        : 0.45;

      for (let i = 89; i >= 0; i--) {
        const d = subDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');

        // Always complete today for Exercise to show completed state
        const shouldComplete = (i === 0 && habit.title.includes('Exercise')) || Math.random() < completionProbability;

        if (shouldComplete) {
          logs.push({
            habitId: habit._id,
            userId: demoUser._id,
            completedAt: d,
            completionDate: dateStr,
          });
        }
      }
    });

    await HabitLog.insertMany(logs);
    console.log(`[Seed Engine] Created ${logs.length} historical habit completion logs across 90 days.`);

    // Recalculate User Stats
    const totalCompletions = await HabitLog.countDocuments({ userId: demoUser._id });
    demoUser.xp = totalCompletions * 10 + 240;
    demoUser.level = calculateLevel(demoUser.xp);
    const badgeEval = evaluateBadges(demoUser, habits, totalCompletions);
    demoUser.badges = badgeEval.updatedBadges;
    await demoUser.save();

    console.log(`[Seed Engine] Successfully seeded database for Alex Rivera (${demoUser.xp} XP, Level ${demoUser.level}).`);
    await mongoose.connection.close();
    console.log('[Seed Engine] Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Engine Error]', error);
    process.exit(1);
  }
};

seedData();
