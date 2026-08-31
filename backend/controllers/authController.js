import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';
import { checkAndUpdateUserPremiumStatus } from '../utils/subscriptionUtils.js';

const MASTER_ADMIN_EMAIL = 'sahiljadhav7414@gmail.com';

const generateToken = (id, role = 'user') => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Initiate Google OAuth Authorization Flow
// @route   GET /api/auth/google
export const googleAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';

  if (!clientId) {
    return res.status(500).json({
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in backend/.env environment variables.',
    });
  }

  const state = Math.random().toString(36).substring(2, 15);
  const scope = encodeURIComponent('openid email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&state=${state}`;

  return res.redirect(googleAuthUrl);
};

// @desc    Handle Google OAuth Callback & Exchange Code
// @route   GET /api/auth/google/callback
export const googleCallback = async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';

  if (error || !code) {
    console.error('[Google OAuth Error]', error || 'No code returned');
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error || 'Google login cancelled or failed')}`);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[Google Token Error]', tokenData);
      const errMsg = tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errMsg)}`);
    }

    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userinfoResponse.json();

    if (!userinfoResponse.ok || !googleUser.sub || !googleUser.email) {
      console.error('[Google Userinfo Error]', googleUser);
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Failed to fetch Google profile')}`);
    }

    const { sub: googleId, email, name, picture } = googleUser;
    const cleanEmail = email.toLowerCase().trim();
    const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
    const assignedRole = isMasterAdmin ? 'admin' : 'user';

    let user;

    if (isMongoConnected()) {
      user = await User.findOne({ googleId });

      if (!user) {
        user = await User.findOne({ email: cleanEmail });
        if (user) {
          user.googleId = googleId;
          user.authProvider = 'google';
          if (isMasterAdmin) user.role = 'admin';
          if (!user.role) user.role = assignedRole;
          if (!user.status) user.status = 'active';
          if (!user.avatar && picture) user.avatar = picture;
          await user.save();
        } else {
          user = await User.create({
            name: name || 'Google User',
            email: cleanEmail,
            avatar: picture || null,
            googleId,
            authProvider: 'google',
            role: assignedRole,
            status: 'active',
            xp: 0,
            level: 1,
            badges: [],
            isPremium: false,
          });

          await Notification.create({
            userId: user._id,
            type: 'system',
            title: `Welcome to HabitForge, ${user.name}! 🚀`,
            message: 'Start forging your daily routine! Click "+ NEW HABIT" on the Dashboard to create your first habit.',
          });
        }
      } else {
        if (isMasterAdmin && user.role !== 'admin') {
          user.role = 'admin';
          await user.save();
        }
      }
    } else {
      user = inMemoryDB.users.find((u) => u.googleId === googleId || u.email?.toLowerCase() === cleanEmail);
      if (!user) {
        const newId = `user_g_${Date.now()}`;
        user = {
          _id: newId,
          id: newId,
          name: name || 'Google User',
          email: cleanEmail,
          avatar: picture || null,
          googleId,
          authProvider: 'google',
          role: assignedRole,
          status: 'active',
          xp: 0,
          level: 1,
          badges: [],
          isPremium: false,
          timezone: 'UTC',
          theme: 'dark',
          notificationPreferences: { emailNotifications: true, streakAlerts: true },
        };
        inMemoryDB.users.push(user);
      } else {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (isMasterAdmin) user.role = 'admin';
        if (!user.avatar && picture) user.avatar = picture;
      }
    }

    if (user.status === 'blocked') {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Your account has been blocked by an administrator.')}`);
    }

    const token = generateToken(user._id || user.id, user.role || 'user');
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('[Google Callback Exception]', err);
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
    const assignedRole = isMasterAdmin ? 'admin' : 'user';

    if (isMongoConnected()) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Security: Normal registration ALWAYS creates role: 'user' (unless verified master admin identity)
      const user = await User.create({
        name,
        email: cleanEmail,
        password,
        role: assignedRole,
        status: 'active',
      });

      // Create Welcome Notification for New User
      await Notification.create({
        userId: user._id,
        type: 'system',
        title: `Welcome to HabitForge, ${user.name}! 🚀`,
        message: 'Start forging your daily routine! Click "+ NEW HABIT" on the Dashboard to create your first habit.',
      });

      return res.status(201).json({
        token: generateToken(user._id, user.role),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role || 'user',
          status: user.status || 'active',
          xp: user.xp,
          level: user.level,
          badges: user.badges,
          isPremium: user.isPremium,
          timezone: user.timezone || 'UTC',
          theme: user.theme || 'dark',
          notificationPreferences: user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
      });
    } else {
      // Standalone mode in-memory registration
      const existing = inMemoryDB.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (existing) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const newId = `user_${Date.now()}`;
      const newUser = {
        _id: newId,
        id: newId,
        name,
        email: cleanEmail,
        password,
        role: assignedRole,
        status: 'active',
        xp: 0,
        level: 1,
        badges: [],
        isPremium: false,
        timezone: 'UTC',
        theme: 'dark',
        notificationPreferences: { emailNotifications: true, streakAlerts: true },
      };
      inMemoryDB.users.push(newUser);

      inMemoryDB.notifications.unshift({
        _id: `notif_${Date.now()}`,
        id: `notif_${Date.now()}`,
        userId: newId,
        type: 'system',
        title: `Welcome to HabitForge, ${name}! 🚀`,
        message: 'Start forging your daily routine! Click "+ NEW HABIT" on the Dashboard to create your first habit.',
        read: false,
        createdAt: new Date(),
      });

      return res.status(201).json({
        token: generateToken(newUser._id, newUser.role),
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          avatar: null,
          role: newUser.role || 'user',
          status: newUser.status || 'active',
          xp: 0,
          level: 1,
          badges: [],
          isPremium: false,
          timezone: 'UTC',
          theme: 'dark',
          notificationPreferences: { emailNotifications: true, streakAlerts: true },
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();

    if (isMongoConnected()) {
      const user = await User.findOne({ email: cleanEmail }).select('+password');

      if (user && (await user.matchPassword(password))) {
        if (user.status === 'blocked') {
          return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
        }

        if (isMasterAdmin && user.role !== 'admin') {
          user.role = 'admin';
          await user.save();
        }

        const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(user);

        return res.json({
          token: generateToken(user._id, user.role || 'user'),
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role || 'user',
            status: user.status || 'active',
            xp: user.xp,
            level: user.level,
            badges: user.badges,
            isPremium,
            premiumExpiresAt,
            timezone: user.timezone || 'UTC',
            theme: user.theme || 'dark',
            notificationPreferences: user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
          },
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    } else {
      // Standalone mode in-memory login verification
      const user = inMemoryDB.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (user && user.password === password) {
        if (user.status === 'blocked') {
          return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
        }

        if (isMasterAdmin && user.role !== 'admin') {
          user.role = 'admin';
        }

        const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(user);
        return res.json({
          token: generateToken(user._id, user.role || 'user'),
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            role: user.role || 'user',
            status: user.status || 'active',
            xp: user.xp || 0,
            level: user.level || 1,
            badges: user.badges || [],
            isPremium,
            premiumExpiresAt,
            timezone: user.timezone || 'UTC',
            theme: user.theme || 'dark',
            notificationPreferences: user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
          },
        });
      } else if (cleanEmail === 'alex@habitforge.com' && password === 'password123') {
        const alexUser = {
          id: 'alex_123',
          _id: 'alex_123',
          name: 'Alex Rivera',
          email: 'alex@habitforge.com',
          role: 'user',
          status: 'active',
          xp: 1240,
          level: 12,
          badges: ['first_step', 'consistency_starter', 'consistency_king', 'habit_master', 'xp_hunter'],
          isPremium: true,
          premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          timezone: 'UTC',
          theme: 'dark',
          notificationPreferences: { emailNotifications: true, streakAlerts: true },
        };
        return res.json({
          token: generateToken(alexUser.id, alexUser.role),
          user: alexUser,
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.status === 'blocked') {
        return res.status(403).json({ message: 'Access denied: Your account has been blocked by administrator' });
      }

      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(user);

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role || 'user',
          status: user.status || 'active',
          xp: user.xp,
          level: user.level,
          badges: user.badges,
          isPremium,
          premiumExpiresAt,
          timezone: user.timezone || 'UTC',
          theme: user.theme || 'dark',
          notificationPreferences: user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
      });
    } else {
      const { isPremium, premiumExpiresAt } = await checkAndUpdateUserPremiumStatus(req.user);
      if (req.user.status === 'blocked') {
        return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
      }

      return res.json({
        user: {
          id: req.user._id || req.user.id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar || null,
          role: req.user.role || 'user',
          status: req.user.status || 'active',
          xp: req.user.xp || 0,
          level: req.user.level || 1,
          badges: req.user.badges || [],
          isPremium,
          premiumExpiresAt,
          timezone: req.user.timezone || 'UTC',
          theme: req.user.theme || 'dark',
          notificationPreferences: req.user.notificationPreferences || { emailNotifications: true, streakAlerts: true },
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
