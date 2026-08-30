import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config();
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { User } from './models/User.js';
import { Habit } from './models/Habit.js';
import { HabitLog } from './models/HabitLog.js';
import { XPTransaction } from './models/XPTransaction.js';
import { FriendRequest } from './models/FriendRequest.js';
import { format, subDays } from 'date-fns';
import { calculateLevel, evaluateBadges } from './utils/gamification.js';
import { runGlobalSubscriptionCheck } from './utils/subscriptionUtils.js';
import { isMongoConnected } from './config/inMemoryStore.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:5173',
      'https://habit-forge-plum.vercel.app',
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean)
  )
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);


function validateBrevoEmailConfig() {
  const provider = process.env.EMAIL_PROVIDER || 'brevo';
  const transport = (process.env.EMAIL_TRANSPORT || 'api').toLowerCase();
  
  if (provider === 'brevo') {
    if (transport === 'api') {
      if (!process.env.BREVO_API_KEY) {
        console.warn('[Brevo Config Warning] BREVO_API_KEY is not set in backend/.env. Enter your key in backend/.env for Brevo API email dispatching.');
      } else {
        console.log('[Brevo Email Service] Initialized in API mode (Official SDK @getbrevo/brevo)');
      }
    } else if (transport === 'smtp') {
      if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
        console.warn('[Brevo Config Warning] BREVO_SMTP_USER or BREVO_SMTP_KEY is not set in backend/.env. Enter credentials for Brevo SMTP dispatching.');
      } else {
        console.log('[Brevo Email Service] Initialized in SMTP mode (smtp-relay.brevo.com)');
      }
    }
  }
}

validateBrevoEmailConfig();

app.get('/api/health', (req, res) => {
  res.json({
    server: 'ok',
    database: isMongoConnected() ? 'connected' : 'standalone_in_memory',
    email: process.env.BREVO_API_KEY ? 'configured' : 'not_configured',
    razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not_configured',
    googleOAuth: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not_configured',
    timestamp: new Date(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/email', emailRoutes);


app.use((req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

async function autoSeedIfEmpty() {
  try {
    if (!isMongoConnected()) return;
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      console.log('[Auto-Seed] Initializing rich demo data for HabitForge...');
      
      const alex = await User.create({
        name: 'Alex Rivera',
        email: 'alex@habitforge.com',
        password: 'password123',
        xp: 1420,
        level: calculateLevel(1420),
        badges: ['first_step', 'consistency_starter', 'consistency_king', 'habit_master', 'xp_hunter'],
        isPremium: true,
      });

      const sarah = await User.create({
        name: 'Sarah Connor',
        email: 'sarah@habitforge.com',
        password: 'password123',
        xp: 1850,
        level: calculateLevel(1850),
        badges: ['first_step', 'consistency_king', 'habit_master', 'century_club'],
        isPremium: false,
      });

      const john = await User.create({
        name: 'John Doe',
        email: 'john@habitforge.com',
        password: 'password123',
        xp: 980,
        level: calculateLevel(980),
        badges: ['first_step', 'consistency_starter'],
        isPremium: false,
      });

      const emma = await User.create({
        name: 'Emma Watson',
        email: 'emma@habitforge.com',
        password: 'password123',
        xp: 2200,
        level: calculateLevel(2200),
        badges: ['first_step', 'consistency_king', 'habit_master', 'xp_hunter', 'century_club'],
        isPremium: true,
      });

      // Friendships
      await FriendRequest.create({ senderId: alex._id, receiverId: sarah._id, status: 'accepted' });
      await FriendRequest.create({ senderId: alex._id, receiverId: john._id, status: 'accepted' });
      await FriendRequest.create({ senderId: emma._id, receiverId: alex._id, status: 'accepted' });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      const habitsData = [
        {
          userId: alex._id,
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
          lastCompletedDate: todayStr,
        },
        {
          userId: alex._id,
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
          lastCompletedDate: yesterdayStr,
        },
        {
          userId: alex._id,
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
          lastCompletedDate: yesterdayStr,
        },
        {
          userId: alex._id,
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
          lastCompletedDate: yesterdayStr,
        },
      ];

      const habits = await Habit.insertMany(habitsData);

      const logs = [];
      const xpTx = [];
      const today = new Date();

      habits.forEach((habit) => {
        for (let i = 364; i >= 0; i--) {
          const d = subDays(today, i);
          const dateStr = format(d, 'yyyy-MM-dd');
          const prob = i < 30 ? 0.8 : 0.45;
          if (Math.random() < prob) {
            logs.push({
              habitId: habit._id,
              userId: alex._id,
              completedAt: d,
              completionDate: dateStr,
            });
            xpTx.push({
              userId: alex._id,
              amount: 10,
              reason: 'HABIT_COMPLETION',
              sourceId: habit._id.toString(),
              createdAt: d,
            });
          }
        }
      });

      // Weekly XP for Sarah, John, Emma
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        xpTx.push({ userId: sarah._id, amount: 60, reason: 'HABIT_COMPLETION', createdAt: d });
        xpTx.push({ userId: john._id, amount: 40, reason: 'HABIT_COMPLETION', createdAt: d });
        xpTx.push({ userId: emma._id, amount: 80, reason: 'HABIT_COMPLETION', createdAt: d });
      }

      await HabitLog.insertMany(logs);
      await XPTransaction.insertMany(xpTx);

      console.log(`[Auto-Seed Complete] Rich social & 365-day dataset initialized!`);
    }
  } catch (err) {
    console.error('[Auto-Seed Warning]', err.message);
  }
}

connectDB().then(async (connected) => {
  if (!connected && process.env.NODE_ENV === 'production') {
    console.error('[FATAL DATABASE ERROR] Failed to connect to MongoDB Atlas in production. Process exiting.');
    process.exit(1);
  }

  if (process.env.AUTO_SEED_DEMO === 'true') {
    await autoSeedIfEmpty();
  }
  await runGlobalSubscriptionCheck();
  // Check subscription expirations every hour
  setInterval(() => {
    runGlobalSubscriptionCheck();
  }, 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`[HabitForge API Server] Running on http://localhost:${PORT}`);
  });
});

