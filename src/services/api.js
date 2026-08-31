import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle stale/expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthEndpoint && localStorage.getItem('token')) {
        console.warn('[API Interceptor] Stale token detected (401). Clearing token from localStorage.');
        localStorage.removeItem('token');
        localStorage.removeItem('habitforge_user');
        localStorage.removeItem('habitforge_habits');
        localStorage.removeItem('habitforge_completions');
        localStorage.removeItem('habitforge_heatmap');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
};

export const habitsAPI = {
  getAll: (includeArchived = false) => api.get(`/habits?includeArchived=${includeArchived}`),
  create: (habitData) => api.post('/habits', habitData),
  update: (id, habitData) => api.put(`/habits/${id}`, habitData),
  delete: (id) => api.delete(`/habits/${id}`),
  checkIn: (id) => api.post(`/habits/${id}/check-in`),
  getHistory: (id) => api.get(`/habits/${id}/history`),
};

export const analyticsAPI = {
  getCompletions: (period = '30d', category = null) =>
    api.get('/analytics/completions', {
      params: {
        period,
        ...(category && category !== 'All Categories' ? { category } : {}),
      },
    }),
  getHeatmap: (days = 90, habitId = null, category = null) =>
    api.get('/analytics/heatmap', {
      params: {
        days,
        ...(habitId && habitId !== 'all' ? { habitId } : {}),
        ...(category && category !== 'All Categories' ? { category } : {}),
      },
    }),
  getDayDetails: (date) => api.get(`/analytics/day-details?date=${date}`),
  getOverview: () => api.get('/analytics/overview'),
  exportCSV: () =>
    api.get('/analytics/export', {
      responseType: 'blob',
    }),
};

export const usersAPI = {
  getDashboardSummary: () => api.get('/users/dashboard-summary'),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  upgradePremium: () => api.post('/users/upgrade-premium'),
  cancelPremium: () => api.post('/users/cancel-premium'),
};

export const socialAPI = {
  searchUsers: (query) => api.get(`/social/users/search?q=${encodeURIComponent(query)}`),
  getSuggestedFriends: () => api.get('/social/friends/suggested'),
  getFriends: () => api.get('/social/friends'),
  getPendingRequests: () => api.get('/social/friends/requests'),
  sendRequest: (receiverId) => api.post(`/social/friends/request/${receiverId}`),
  respondRequest: (requestId, action) => api.put(`/social/friends/request/${requestId}/respond`, { action }),
  cancelRequest: (requestId) => api.delete(`/social/friends/request/${requestId}`),
  removeFriend: (friendId) => api.delete(`/social/friends/${friendId}`),
  getLeaderboard: () => api.get('/social/leaderboard'),
  getFriendsLeaderboard: () => api.get('/social/leaderboard/friends'),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const paymentsAPI = {
  createOrder: () => api.post('/payments/create-order'),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getHistory: () => api.get('/payments/history'),
  downloadReceipt: (paymentId) =>
    api.get(`/payments/${paymentId}/receipt`, {
      responseType: 'blob',
    }),
  resendReceipt: (paymentId) => api.post(`/payments/${paymentId}/resend-receipt`),
  submitSupportRequest: (paymentId, reason) => api.post('/payments/support-request', { paymentId, reason }),
};

export const emailAPI = {
  getStatus: () => api.get('/email/status'),
  sendTest: () => api.post('/email/test'),
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
};




