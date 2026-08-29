import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import {
  Search,
  Bell,
  X,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getPageTitle(path) {
  switch (path) {
    case '/habits': return 'My Habits';
    case '/analytics': return 'Analytics';
    case '/social': return 'Social';
    case '/leaderboard': return 'Leaderboard';
    case '/achievements': return 'Achievements';
    case '/premium': return 'Premium';
    case '/profile': return 'Profile';
    case '/settings': return 'Settings';
    case '/dashboard':
    default:
      return 'Dashboard';
  }
}

export default function AppLayout({ children }) {
  const { habits, allBadges, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getNotifications();
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Notifications fetch error:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, user]);

  // Keyboard shortcut Ctrl+K to open Search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = searchQuery.trim()
    ? [
        ...habits
          .filter(
            (h) =>
              h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map((h) => ({ type: 'habit', id: h.id || h._id, title: h.title, desc: h.description, icon: h.icon || '🏃', path: '/habits' })),
        ...allBadges
          .filter(
            (b) =>
              b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((b) => ({ type: 'badge', id: b.id, title: b.name, desc: b.description, icon: b.icon || '🏆', path: '/achievements' })),
      ]
    : [];

  async function markAllRead() {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#131316] text-[#e4e1e6]">
      <Sidebar />
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top header bar */}
        <header
          className="fixed top-0 z-40 h-16 flex items-center justify-between px-8 border-b"
          style={{
            left: 256,
            right: 0,
            background: 'rgba(19, 19, 22, 0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(73, 68, 84, 0.2)',
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="font-geist font-bold text-[#d0bcff]">HabitForge</span>
            <span className="text-[#a078ff] font-bold">/</span>
            <span className="font-geist font-extrabold text-white tracking-wide">{getPageTitle(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1f1f22] border border-white/10 text-[#cbc3d7] hover:text-white hover:border-white/20 transition-all text-xs font-geist cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#cbc3d7]" />
              <span>Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#353438] text-[10px] text-white/60 font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((o) => !o)}
                className="p-2 rounded-xl text-[#cbc3d7] hover:text-white hover:bg-white/5 transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#a078ff] shadow-[0_0_8px_#a078ff]" />
                )}
              </button>

              {/* Notifications Popover Panel */}
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#1f1f22] border border-white/10 shadow-2xl p-4 z-50 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#d0bcff]" />
                          <h3 className="font-bold font-geist text-sm text-white">
                            Notifications
                          </h3>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-[10px] font-bold font-geist text-[#d0bcff] hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n._id || n.id}
                              className={`p-3 rounded-xl border transition-all ${
                                n.read
                                  ? 'bg-[#131316]/50 border-white/5 opacity-60'
                                  : 'bg-[#2a2a2d] border-[#d0bcff]/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold font-geist text-white">
                                  {n.title}
                                </span>
                                <span className="text-[9px] font-geist text-[#cbc3d7]">
                                  {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                </span>
                              </div>
                              <p className="text-[11px] font-inter text-[#cbc3d7] mt-1 leading-snug">
                                {n.message || n.desc}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#cbc3d7] text-center py-4">No notifications yet.</p>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Search Modal */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setSearchOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -10 }}
                className="w-full max-w-xl rounded-2xl bg-[#1f1f22] border border-white/10 shadow-2xl p-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#131316] border border-white/10">
                  <Search className="w-5 h-5 text-[#d0bcff]" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search habits, descriptions, or badges..."
                    className="w-full bg-transparent text-sm font-inter text-white outline-none"
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-1 rounded-lg text-[#cbc3d7] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {searchQuery.trim() && (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(item.path);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#131316] border border-white/5 hover:border-[#d0bcff]/40 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                              <h4 className="text-sm font-bold font-geist text-white">
                                {item.title}
                              </h4>
                              {item.desc && (
                                <p className="text-xs text-[#cbc3d7] truncate max-w-sm">
                                  {item.desc}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#d0bcff]" />
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-xs text-[#cbc3d7] font-geist">
                        No habits or badges matching "{searchQuery}"
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="pt-16 flex-1 bg-[#131316]">
          {children}
        </main>
      </div>
    </div>
  );
}
