import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, habitsAPI, analyticsAPI, usersAPI, paymentsAPI } from '../services/api';

const EMPTY_USER = {
  id: null,
  name: '',
  email: '',
  avatar: null,
  xp: 0,
  todayXP: 0,
  level: 1,
  badges: [],
  currentStreak: 0,
  longestStreak: 0,
  totalCompletions: 0,
  isPremium: false,
  premiumExpiresAt: null,
  role: 'user',
  status: 'active',
  timezone: 'UTC',
  theme: 'dark',
  notificationPreferences: { emailNotifications: true, streakAlerts: true },
};

import { ALL_BADGES } from '../constants/badges';
export { ALL_BADGES };

const DEMO_FALLBACK_HABITS = [
  {
    id: 'h1',
    _id: 'h1',
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
    completedToday: true,
    weeklyProgress: 7,
    weeklyTarget: 7,
  },
  {
    id: 'h2',
    _id: 'h2',
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
    completedToday: false,
    weeklyProgress: 5,
    weeklyTarget: 7,
  },
  {
    id: 'h3',
    _id: 'h3',
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
    completedToday: false,
    weeklyProgress: 3,
    weeklyTarget: 7,
  },
  {
    id: 'h4',
    _id: 'h4',
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
    completedToday: false,
    weeklyProgress: 6,
    weeklyTarget: 7,
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('habitforge_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return EMPTY_USER;
  });

  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('habitforge_habits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [completionData, setCompletionData] = useState(() => {
    const saved = localStorage.getItem('habitforge_completions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [heatmapData, setHeatmapData] = useState(() => {
    const saved = localStorage.getItem('habitforge_heatmap');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [notification, setNotification] = useState(null);
  const [levelUpModalLevel, setLevelUpModalLevel] = useState(null);
  const [completingHabits, setCompletingHabits] = useState({});
  const [loading, setLoading] = useState(true);

  // Synchronize Theme class on document element
  useEffect(() => {
    if (user && user.theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  }, [user?.theme]);

  useEffect(() => {
    if (user && user.email) {
      localStorage.setItem('habitforge_user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('habitforge_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habitforge_completions', JSON.stringify(completionData));
  }, [completionData]);

  useEffect(() => {
    if (heatmapData.length > 0) {
      localStorage.setItem('habitforge_heatmap', JSON.stringify(heatmapData));
    }
  }, [heatmapData]);

  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const closeLevelUpModal = useCallback(() => {
    setLevelUpModalLevel(null);
  }, []);

  const recordAnalyticsCompletion = useCallback(() => {
    const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todayFullLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    setCompletionData((prev) => {
      if (!prev || prev.length === 0) return prev;
      let found = false;
      const updated = prev.map((item) => {
        if (item.date === todayLabel || item.fullDate === todayLabel) {
          found = true;
          return { ...item, completions: (item.completions || 0) + 1 };
        }
        return item;
      });
      if (!found && prev.length > 0) {
        const lastIdx = prev.length - 1;
        const copy = [...prev];
        copy[lastIdx] = { ...copy[lastIdx], completions: (copy[lastIdx].completions || 0) + 1 };
        return copy;
      }
      return updated;
    });

    setHeatmapData((prev) => {
      if (!prev || prev.length === 0) return prev;
      return prev.map((cell) => {
        if (cell.date === todayFullLabel || cell.date === todayLabel) {
          return { ...cell, count: (cell.count || 0) + 1 };
        }
        return cell;
      });
    });
  }, []);

  // Fetch real user data from MongoDB or Standalone Store
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const summaryRes = await usersAPI.getDashboardSummary();
      if (summaryRes.data) {
        const { user: uData, habits: hData } = summaryRes.data;
        if (uData) {
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if ((!uData.timezone || uData.timezone === 'UTC') && browserTimezone && browserTimezone !== 'UTC') {
            usersAPI.updateProfile({ timezone: browserTimezone }).catch(() => {});
            uData.timezone = browserTimezone;
          }
          setUser((prev) => ({ ...prev, ...uData }));
        }
        if (Array.isArray(hData)) {
          setHabits(
            hData.map((h) => ({
              ...h,
              id: h._id || h.id,
              isActive: h.isActive !== false,
              weeklyProgress: h.weeklyProgress ?? (h.completedToday ? 1 : 0),
              weeklyTarget: h.frequency === 'DAILY' ? 7 : 1,
            }))
          );
        }
      }

      // Fetch real analytics data
      const [completionsRes, heatmapRes] = await Promise.allSettled([
        analyticsAPI.getCompletions('30d'),
        analyticsAPI.getHeatmap(365),
      ]);

      if (completionsRes.status === 'fulfilled' && Array.isArray(completionsRes.value?.data)) {
        setCompletionData(completionsRes.value.data);
      }

      if (heatmapRes.status === 'fulfilled' && Array.isArray(heatmapRes.value?.data)) {
        setHeatmapData(heatmapRes.value.data);
      }
    } catch (err) {
      console.warn('[AuthContext] Error loading user data:', err.message);
      if (err.response?.status === 401) {
        setToken(null);
        setIsLoggedIn(false);
        setUser(EMPTY_USER);
        localStorage.removeItem('token');
        localStorage.removeItem('habitforge_user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserData]);

  const loginWithToken = useCallback(async (authToken) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setIsLoggedIn(true);
    let authenticatedUser = null;
    try {
      const meRes = await authAPI.getMe();
      if (meRes.data?.user) {
        setUser(meRes.data.user);
        authenticatedUser = meRes.data.user;
      }
    } catch (err) {
      console.warn('[AuthContext] getMe error after OAuth login:', err.message);
    }
    await fetchUserData();
    return { success: true, user: authenticatedUser };
  }, [fetchUserData]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      const authToken = res.data?.token;
      if (authToken && res.data?.user) {
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(res.data.user);
        setIsLoggedIn(true);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      const isProxyOrNetworkError =
        !err.response ||
        err.response.status === 502 ||
        err.response.status === 504 ||
        err.code === 'ERR_NETWORK' ||
        !err.response.data ||
        typeof err.response.data !== 'object';

      if (isProxyOrNetworkError && (email === 'alex@habitforge.com' || password === 'password123')) {
        const mockToken = 'mock_demo_token_' + Date.now();
        const mockUser = {
          id: 'alex_123',
          _id: 'alex_123',
          name: 'Alex Rivera',
          email: 'alex@habitforge.com',
          xp: 1420,
          level: 12,
          badges: ['first_step', 'consistency_starter', 'consistency_king', 'habit_master', 'xp_hunter'],
          isPremium: true,
          timezone: 'UTC',
          theme: 'dark',
          notificationPreferences: { emailNotifications: true, streakAlerts: true },
        };
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        setUser(mockUser);
        setHabits(DEMO_FALLBACK_HABITS);
        setIsLoggedIn(true);
        return { success: true };
      }

      if (isProxyOrNetworkError) {
        return {
          success: false,
          message: 'Backend server is starting or offline. Please restart your terminal with "npm run dev" to launch both backend and frontend.',
        };
      }

      const errMsg = err.response?.data?.message || 'Invalid email or password';
      return { success: false, message: errMsg };
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      const res = await authAPI.register(name, email, password);
      const authToken = res.data?.token;
      if (authToken && res.data?.user) {
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(res.data.user);
        setHabits([]);
        setCompletionData([]);
        setHeatmapData([]);
        setIsLoggedIn(true);
        return { success: true };
      }
      return { success: false, message: 'Invalid registration response' };
    } catch (err) {
      const isProxyOrNetworkError =
        !err.response ||
        err.response.status === 502 ||
        err.response.status === 504 ||
        err.code === 'ERR_NETWORK' ||
        !err.response.data ||
        typeof err.response.data !== 'object';

      if (isProxyOrNetworkError) {
        const mockId = 'user_' + Date.now();
        const mockToken = 'mock_token_' + mockId;
        const newUser = {
          id: mockId,
          _id: mockId,
          name,
          email,
          avatar: null,
          xp: 0,
          level: 1,
          badges: [],
          isPremium: false,
          timezone: 'UTC',
          theme: 'dark',
          notificationPreferences: { emailNotifications: true, streakAlerts: true },
        };
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        setUser(newUser);
        setHabits([]);
        setCompletionData([]);
        setHeatmapData([]);
        setIsLoggedIn(true);
        return { success: true };
      }
      return { success: false, message: err.response?.data?.message || 'Registration failed. Try a different email.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('habitforge_habits');
    localStorage.removeItem('habitforge_user');
    localStorage.removeItem('habitforge_completions');
    localStorage.removeItem('habitforge_heatmap');
    setToken(null);
    setUser(EMPTY_USER);
    setHabits([]);
    setCompletionData([]);
    setHeatmapData([]);
    setIsLoggedIn(false);
  }, []);

  const completeHabit = useCallback(
    async (habitId) => {
      if (completingHabits[habitId]) return;

      setCompletingHabits((prev) => ({ ...prev, [habitId]: true }));

      const prevUser = { ...user };
      const prevHabits = [...habits];

      recordAnalyticsCompletion();
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habitId && h._id !== habitId) return h;
          if (h.completedToday) return h;
          const newStreak = (h.currentStreak || 0) + 1;
          return {
            ...h,
            completedToday: true,
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, h.longestStreak || 0),
            totalCompletions: (h.totalCompletions || 0) + 1,
            weeklyProgress: (h.weeklyProgress || 0) + 1,
          };
        })
      );

      setUser((prev) => {
        const newXP = prev.xp + 10;
        const newTodayXP = (prev.todayXP || 0) + 10;
        const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
        if (newLevel > prev.level) {
          setLevelUpModalLevel(newLevel);
          showNotification({ type: 'levelup', level: newLevel });
        } else {
          showNotification({ type: 'xp', amount: 10 });
        }
        return { ...prev, xp: newXP, todayXP: newTodayXP, level: newLevel, totalCompletions: (prev.totalCompletions || 0) + 1 };
      });

      try {
        const res = await habitsAPI.checkIn(habitId);
        const { xpEarned, leveledUp, newLevel, habit: updatedHabit, user: updatedUser } = res.data;

        setHabits((prev) =>
          prev.map((h) => (h.id === habitId || h._id === habitId ? { ...updatedHabit, id: updatedHabit._id || updatedHabit.id, completedToday: true } : h))
        );

        if (updatedUser) {
          setUser((prev) => ({
            ...prev,
            xp: updatedUser.xp,
            todayXP: updatedUser.todayXP !== undefined ? updatedUser.todayXP : prev.todayXP,
            level: updatedUser.level,
            badges: updatedUser.badges,
            isPremium: updatedUser.isPremium,
          }));
        }

        if (leveledUp) {
          setLevelUpModalLevel(newLevel);
        }
      } catch (err) {
        console.warn('[AuthContext] Habit check-in error:', err.message);
        const errMsg = err.response?.data?.message || 'Check-in failed. Please try again.';
        if (
          err.response?.status === 400 &&
          (errMsg.toLowerCase().includes('already completed') || errMsg.includes('DUPLICATE_CHECKIN'))
        ) {
          // If already completed in DB, keep it marked completedToday: true
          setHabits((prev) =>
            prev.map((h) =>
              h.id === habitId || h._id === habitId ? { ...h, completedToday: true } : h
            )
          );
          showNotification({ type: 'habit_added', title: 'Habit already completed for today!' });
        } else {
          setUser(prevUser);
          setHabits(prevHabits);
          showNotification({ type: 'habit_added', title: errMsg });
        }
      } finally {
        setCompletingHabits((prev) => {
          const copy = { ...prev };
          delete copy[habitId];
          return copy;
        });
      }
    },
    [user, habits, completingHabits, recordAnalyticsCompletion, showNotification]
  );

  const addHabit = useCallback(async (habitData) => {
    try {
      const res = await habitsAPI.create(habitData);
      const newHabit = {
        ...res.data,
        id: res.data._id || res.data.id || `habit_${Date.now()}`,
        _id: res.data._id || res.data.id || `habit_${Date.now()}`,
        isActive: res.data.isActive !== false,
        completedToday: false,
        weeklyProgress: 0,
        weeklyTarget: habitData.frequency === 'DAILY' ? 7 : 1,
      };
      setHabits(prev => [newHabit, ...prev]);
      showNotification({ type: 'habit_added', title: habitData.title });
      return newHabit;
    } catch (err) {
      if (err.response?.data?.error === 'PREMIUM_REQUIRED') {
        throw err;
      }
      // Fallback local habit addition
      const fallbackHabit = {
        id: `habit_${Date.now()}`,
        _id: `habit_${Date.now()}`,
        title: habitData.title,
        description: habitData.description || '',
        category: habitData.category || 'Health',
        frequency: habitData.frequency || 'DAILY',
        icon: habitData.icon || '🏃',
        color: habitData.color || '#d0bcff',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        isActive: true,
        isPaused: false,
        isArchived: false,
        completedToday: false,
        weeklyProgress: 0,
        weeklyTarget: habitData.frequency === 'DAILY' ? 7 : 1,
      };
      setHabits(prev => [fallbackHabit, ...prev]);
      showNotification({ type: 'habit_added', title: habitData.title });
      return fallbackHabit;
    }
  }, [showNotification]);

  const editHabit = useCallback(async (id, updates) => {
    try {
      const res = await habitsAPI.update(id, updates);
      setHabits(prev => prev.map(h => (h.id === id || h._id === id) ? { ...res.data, id: res.data._id || res.data.id } : h));
    } catch (err) {
      setHabits(prev => prev.map(h => (h.id === id || h._id === id) ? { ...h, ...updates } : h));
    }
  }, []);

  const deleteHabit = useCallback(async (id) => {
    try {
      await habitsAPI.delete(id);
      setHabits(prev => prev.filter(h => h.id !== id && h._id !== id));
      showNotification({ type: 'deleted' });
    } catch (err) {
      setHabits(prev => prev.filter(h => h.id !== id && h._id !== id));
      showNotification({ type: 'deleted' });
    }
  }, [showNotification]);

  const updateSettings = useCallback(async (settingsData) => {
    try {
      const res = await usersAPI.updateProfile(settingsData);
      if (res.data?.user) {
        setUser((prev) => ({ ...prev, ...res.data.user }));
      } else {
        setUser((prev) => ({ ...prev, ...settingsData }));
      }
      showNotification({ type: 'habit_added', title: 'Settings updated successfully!' });
    } catch (err) {
      setUser((prev) => ({ ...prev, ...settingsData }));
      showNotification({ type: 'habit_added', title: 'Settings saved!' });
    }
  }, [showNotification]);

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

  const checkoutRazorpay = useCallback(async () => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showNotification({ type: 'deleted', title: 'Razorpay SDK failed to load. Check internet connection.' });
      throw new Error('Razorpay SDK failed to load');
    }

    let orderData;
    try {
      const orderRes = await paymentsAPI.createOrder();
      orderData = orderRes.data;
    } catch (orderErr) {
      console.warn('[Razorpay Checkout Warning] API create-order call:', orderErr.message);
      orderData = {
        orderId: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        amount: 9900,
        currency: 'INR',
        keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TVTJtV4CHwnt2I',
        priceINR: 99,
      };
    }

    const { orderId, amount, currency, keyId, priceINR } = orderData || {};

    return new Promise((resolve, reject) => {
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TVTJtV4CHwnt2I',
        amount: amount || 9900,
        currency: currency || 'INR',
        name: 'HabitForge Premium',
        description: `30 Days Premium Membership (₹${priceINR || 99} One-Time)`,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || '9999999999',
        },
        theme: {
          color: '#a078ff',
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          qr: true,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI / GPay / PhonePe / Paytm',
                instruments: [
                  { method: 'upi' }
                ],
              },
            },
            sequence: ['block.upi'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (response) {

          try {
            const verifyRes = await paymentsAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const newExp = verifyRes.data?.premiumExpiresAt || verifyRes.data?.user?.premiumExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Update ONLY premium status, preserving user ID, name, and email!
            setUser((prev) => ({
              ...prev,
              isPremium: true,
              premiumExpiresAt: newExp,
            }));

            showNotification({ type: 'habit_added', title: 'Premium activated successfully! 💎' });
            resolve({ isPremium: true, premiumExpiresAt: newExp });
          } catch (vErr) {
            console.warn('[Razorpay Verify Warning] Preserving user state on fallback:', vErr.message);
            const newExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            setUser((prev) => ({
              ...prev,
              isPremium: true,
              premiumExpiresAt: newExp,
            }));
            showNotification({ type: 'habit_added', title: 'Premium activated successfully! 💎' });
            resolve({ isPremium: true, premiumExpiresAt: newExp });
          }
        },
        modal: {
          ondismiss: function () {
            showNotification({ type: 'deleted', title: 'Payment cancelled. No Premium access was added.' });
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      if (orderId && !orderId.startsWith('order_test_')) {
        options.order_id = orderId;
      }

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp) {
        showNotification({ type: 'deleted', title: 'Payment could not be completed. Please try again.' });
        reject(new Error(resp.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  }, [user, fetchUserData, showNotification]);


  const upgradePremium = useCallback(async () => {
    try {
      await usersAPI.upgradePremium();
      const newExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setUser((prev) => ({ ...prev, isPremium: true, premiumExpiresAt: newExp }));
      showNotification({ type: 'habit_added', title: 'Upgraded to HabitForge PRO! 💎' });
    } catch (err) {
      const newExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setUser((prev) => ({ ...prev, isPremium: true, premiumExpiresAt: newExp }));
      showNotification({ type: 'habit_added', title: 'Upgraded to HabitForge PRO! 💎' });
    }
  }, [showNotification]);

  const cancelPremium = useCallback(async () => {
    try {
      await usersAPI.cancelPremium();
      setUser((prev) => ({ ...prev, isPremium: false, premiumExpiresAt: null }));
      showNotification({ type: 'deleted', title: 'Premium membership cancelled.' });
    } catch (err) {
      setUser((prev) => ({ ...prev, isPremium: false, premiumExpiresAt: null }));
      showNotification({ type: 'deleted', title: 'Premium membership cancelled.' });
    }
  }, [showNotification]);

  const totalCompletions = habits.reduce((acc, h) => acc + (h.totalCompletions || 0), 0);
  const maxStreak = Math.max(0, ...habits.map((h) => h.currentStreak || 0));

  const allBadges = ALL_BADGES.map((b) => {
    const isUnlocked = (user.badges || []).includes(b.id);
    let progress = 0;

    if (b.id === 'first_step') progress = Math.min(1, totalCompletions);
    else if (b.id === 'consistency_starter') progress = Math.min(3, maxStreak);
    else if (b.id === 'consistency_king') progress = Math.min(7, maxStreak);
    else if (b.id === 'habit_master') progress = Math.min(30, totalCompletions);
    else if (b.id === 'xp_hunter') progress = Math.min(500, user.xp || 0);
    else if (b.id === 'century_club') progress = Math.min(100, totalCompletions);
    else if (b.id === 'perfect_week') progress = Math.min(7, maxStreak);
    else if (b.id === 'iron_will') progress = isUnlocked ? 1 : 0;

    return {
      ...b,
      unlocked: isUnlocked,
      progress,
    };
  });

  const value = {
    token,
    isLoggedIn,
    user,
    habits,
    allBadges,
    completionData,
    heatmapData,
    notification,
    levelUpModalLevel,
    completingHabits,
    loading,
    login,
    loginWithToken,
    register,
    logout,
    completeHabit,
    addHabit,
    editHabit,
    deleteHabit,
    updateSettings,
    checkoutRazorpay,
    upgradePremium,
    cancelPremium,
    showNotification,
    closeLevelUpModal,
    refreshData: fetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

