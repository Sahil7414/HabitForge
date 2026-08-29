import mongoose from 'mongoose';
import { format, subDays } from 'date-fns';

export const isMongoConnected = () => mongoose.connection.readyState === 1;

// Generate realistic history logs for demo standalone mode
const today = new Date();
const demoLogs = [];
for (let i = 364; i >= 0; i--) {
  const d = subDays(today, i);
  const dateStr = format(d, 'yyyy-MM-dd');
  // 75% chance of 1-3 completions per day
  if (Math.random() < 0.75) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let c = 0; c < count; c++) {
      demoLogs.push({
        userId: 'alex_123',
        completionDate: dateStr,
        completedAt: d,
      });
    }
  }
}

export const inMemoryDB = {
  users: [
    {
      _id: 'alex_123',
      id: 'alex_123',
      name: 'Alex Rivera',
      email: 'alex@habitforge.com',
      password: 'password123',
      xp: 1420,
      level: 12,
      badges: ['first_step', 'consistency_starter', 'consistency_king', 'habit_master', 'xp_hunter'],
      isPremium: true,
      createdAt: new Date(),
    },
    {
      _id: 'sarah_456',
      id: 'sarah_456',
      name: 'Sarah Connor',
      email: 'sarah@habitforge.com',
      password: 'password123',
      xp: 1850,
      level: 14,
      badges: ['first_step', 'consistency_king', 'habit_master'],
      isPremium: false,
      createdAt: new Date(),
    },
    {
      _id: 'john_789',
      id: 'john_789',
      name: 'John Doe',
      email: 'john@habitforge.com',
      password: 'password123',
      xp: 980,
      level: 10,
      badges: ['first_step', 'consistency_starter'],
      isPremium: false,
      createdAt: new Date(),
    },
    {
      _id: 'emma_101',
      id: 'emma_101',
      name: 'Emma Watson',
      email: 'emma@habitforge.com',
      password: 'password123',
      xp: 2200,
      level: 15,
      badges: ['first_step', 'consistency_king', 'habit_master', 'xp_hunter', 'century_club'],
      isPremium: true,
      createdAt: new Date(),
    },
  ],
  habits: [
    {
      _id: 'h1',
      id: 'h1',
      userId: 'alex_123',
      title: 'Morning Exercise',
      description: '30 min workout to start the day strong',
      category: 'Fitness',
      frequency: 'DAILY',
      icon: '🏃',
      color: '#ffb95f',
      currentStreak: 14,
      longestStreak: 28,
      totalCompletions: 42,
      isActive: true,
      isPaused: false,
      isArchived: false,
      lastCompletedDate: format(today, 'yyyy-MM-dd'),
      createdAt: new Date(),
    },
    {
      _id: 'h2',
      id: 'h2',
      userId: 'alex_123',
      title: 'Reading — 20 Minutes',
      description: 'Technical books and articles',
      category: 'Learning',
      frequency: 'DAILY',
      icon: '📚',
      color: '#d0bcff',
      currentStreak: 5,
      longestStreak: 12,
      totalCompletions: 28,
      isActive: true,
      isPaused: false,
      isArchived: false,
      lastCompletedDate: format(subDays(today, 1), 'yyyy-MM-dd'),
      createdAt: new Date(),
    },
    {
      _id: 'h3',
      id: 'h3',
      userId: 'alex_123',
      title: 'Drink Water',
      description: '8 glasses throughout the day',
      category: 'Health',
      frequency: 'DAILY',
      icon: '💧',
      color: '#adc6ff',
      currentStreak: 3,
      longestStreak: 10,
      totalCompletions: 18,
      isActive: true,
      isPaused: false,
      isArchived: false,
      lastCompletedDate: format(subDays(today, 1), 'yyyy-MM-dd'),
      createdAt: new Date(),
    },
    {
      _id: 'h4',
      id: 'h4',
      userId: 'alex_123',
      title: 'Practice Coding',
      description: 'LeetCode & side projects',
      category: 'Productivity',
      frequency: 'DAILY',
      icon: '💻',
      color: '#10b981',
      currentStreak: 7,
      longestStreak: 30,
      totalCompletions: 34,
      isActive: true,
      isPaused: false,
      isArchived: false,
      lastCompletedDate: format(subDays(today, 1), 'yyyy-MM-dd'),
      createdAt: new Date(),
    },
  ],
  habitLogs: demoLogs,
  friendRequests: [],
  notifications: [],
};
