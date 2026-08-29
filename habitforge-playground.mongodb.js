/* global use, db */
// HabitForge MongoDB Playground
// Press the Play button ▶ in the top right corner of the editor to run this playground.

// 1. Select the HabitForge database
use('habitforge');

// 2. Query all registered Users
db.getCollection('users').find(
  {},
  { name: 1, email: 1, xp: 1, level: 1, isPremium: 1, theme: 1, createdAt: 1 }
);

// 3. Query all Habits
// db.getCollection('habits').find({});

// 4. Query recent Habit Completion Logs
// db.getCollection('habitlogs').find({}).sort({ completionDate: -1 }).limit(10);

// 5. Query User Notifications
// db.getCollection('notifications').find({}).sort({ createdAt: -1 }).limit(10);
