import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Crown,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Sparkles,
  Eye,
  X,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'block', // 'block' | 'unblock'
    user: null,
  });

  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    user: null,
    loading: false,
    data: null,
  });

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes] = await Promise.all([
        adminAPI.getOverview(),
        adminAPI.getUsers({
          q: searchQuery,
          role: roleFilter,
          status: statusFilter,
        }),
      ]);

      if (overviewRes.data) setOverview(overviewRes.data);
      if (usersRes.data?.users) setUsers(usersRes.data.users);
    } catch (err) {
      console.error('[Admin Panel Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  function requestToggleStatus(targetUser) {
    if (targetUser.email?.toLowerCase() === 'sahiljadhav7414@gmail.com') {
      setFeedbackMessage({ type: 'error', text: 'Cannot alter status of Master Administrator.' });
      return;
    }

    const actionType = targetUser.status === 'blocked' ? 'unblock' : 'block';
    setConfirmModal({
      isOpen: true,
      type: actionType,
      user: targetUser,
    });
  }

  async function executeToggleUserStatus() {
    const targetUser = confirmModal.user;
    if (!targetUser) return;

    const newStatus = confirmModal.type === 'unblock' ? 'active' : 'blocked';
    setActionLoading(targetUser.id);
    try {
      const res = await adminAPI.updateUserStatus(targetUser.id, newStatus);
      setFeedbackMessage({
        type: 'success',
        text: res.data?.message || `User ${targetUser.name} marked as ${newStatus}.`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
      );

      if (detailsModal.isOpen && detailsModal.data?.user?.id === targetUser.id) {
        setDetailsModal((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            user: { ...prev.data.user, status: newStatus },
          },
        }));
      }

      if (overview?.metrics) {
        setOverview((prev) => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            activeUsers:
              newStatus === 'active'
                ? prev.metrics.activeUsers + 1
                : prev.metrics.activeUsers - 1,
            blockedUsers:
              newStatus === 'blocked'
                ? prev.metrics.blockedUsers + 1
                : prev.metrics.blockedUsers - 1,
          },
        }));
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update user status.',
      });
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, type: 'block', user: null });
    }
  }

  async function openUserDetails(targetUser) {
    setDetailsModal({
      isOpen: true,
      user: targetUser,
      loading: true,
      data: null,
    });

    try {
      const res = await adminAPI.getUserDetails(targetUser.id);
      setDetailsModal({
        isOpen: true,
        user: targetUser,
        loading: false,
        data: res.data,
      });
    } catch (err) {
      console.error('[Get User Details Error]', err);
      setDetailsModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }

  const metrics = overview?.metrics || {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status !== 'blocked').length,
    blockedUsers: users.filter((u) => u.status === 'blocked').length,
    premiumUsers: users.filter((u) => u.isPremium && u.status !== 'blocked').length,
    totalCompletions: 0,
    totalPlatformXP: 0,
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] text-[10px] font-extrabold font-geist tracking-wider uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Master Control
              </span>
              <span className="text-xs text-[#cbc3d7] font-geist">• Administrator Portal</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-geist text-white tracking-tight flex items-center gap-3">
              Platform Administration <Crown className="w-7 h-7 text-[#ffb95f]" />
            </h1>
            <p className="text-xs sm:text-sm text-[#cbc3d7] font-inter mt-1">
              Authenticated Administrator: <strong className="text-white">{currentUser?.email}</strong>
            </p>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-geist shadow-xl ${
                feedbackMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-4"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
                Total Users
              </span>
              <div className="text-2xl font-extrabold font-geist text-white mt-1">
                {metrics.totalUsers}
              </div>
            </div>
            <Users className="w-6 h-6 text-[#a078ff]" />
          </div>

          <div className="bg-[#1f1f22] border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold font-geist text-emerald-400 uppercase">
                Active Users
              </span>
              <div className="text-2xl font-extrabold font-geist text-emerald-400 mt-1">
                {metrics.activeUsers}
              </div>
            </div>
            <UserCheck className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="bg-[#1f1f22] border border-red-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold font-geist text-red-400 uppercase">
                Blocked Users
              </span>
              <div className="text-2xl font-extrabold font-geist text-red-400 mt-1">
                {metrics.blockedUsers}
              </div>
            </div>
            <UserX className="w-6 h-6 text-red-400" />
          </div>

          <div className="bg-[#1f1f22] border border-[#ffb95f]/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold font-geist text-[#ffb95f] uppercase">
                PRO Subscribers
              </span>
              <div className="text-2xl font-extrabold font-geist text-[#ffb95f] mt-1">
                {metrics.premiumUsers}
              </div>
            </div>
            <Crown className="w-6 h-6 text-[#ffb95f]" />
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-lg col-span-2 sm:col-span-1">
            <div>
              <span className="text-[11px] font-bold font-geist text-[#d0bcff] uppercase">
                Total Completions
              </span>
              <div className="text-2xl font-extrabold font-geist text-[#d0bcff] mt-1">
                {metrics.totalCompletions?.toLocaleString() || 0}
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-[#d0bcff]" />
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#a078ff]" /> User Directory & Role Controls
              </h2>
              <p className="text-xs text-[#cbc3d7] font-inter mt-0.5">
                Manage registered user permissions, roles, and account statuses.
              </p>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#cbc3d7] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-[#131316] border border-white/10 text-white text-xs font-inter outline-none focus:border-[#d0bcff]/50 w-56"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center bg-[#131316] p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-geist transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#a078ff] text-[#340080]'
                      : 'text-[#cbc3d7] hover:text-white'
                  }`}
                >
                  All ({metrics.totalUsers})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-geist transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500 text-black'
                      : 'text-[#cbc3d7] hover:text-emerald-400'
                  }`}
                >
                  Active ({metrics.activeUsers})
                </button>
                <button
                  onClick={() => setStatusFilter('blocked')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-geist transition-all cursor-pointer ${
                    statusFilter === 'blocked'
                      ? 'bg-red-500 text-white'
                      : 'text-[#cbc3d7] hover:text-red-400'
                  }`}
                >
                  Blocked ({metrics.blockedUsers})
                </button>
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#131316] border border-white/10 text-white text-xs font-geist outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins Only</option>
                <option value="user">Users Only</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Level / XP</th>
                  <th className="py-3 px-4">Auth</th>
                  <th className="py-3 px-4 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-geist">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#cbc3d7]">
                      No users match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isMasterAdmin = u.email?.toLowerCase() === 'sahiljadhav7414@gmail.com';
                    const isBlocked = u.status === 'blocked';

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* User info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#353438] flex items-center justify-center font-bold text-white text-sm shrink-0">
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openUserDetails(u)}
                                  className="font-bold text-white hover:text-[#d0bcff] transition-colors truncate text-left cursor-pointer"
                                >
                                  {u.name}
                                </button>
                                {u.isPremium && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/30">
                                    PRO
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#cbc3d7] truncate block font-inter">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#a078ff]/20 text-[#d0bcff] border border-[#d0bcff]/40 font-extrabold text-[10px] uppercase">
                              <Crown className="w-3 h-3 text-[#ffb95f]" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/5 text-[#cbc3d7] font-medium text-[10px] uppercase">
                              User
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-[10px] uppercase">
                              <Lock className="w-3 h-3" /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>

                        {/* Level / XP */}
                        <td className="py-3.5 px-4 text-[#cbc3d7]">
                          <div className="font-bold text-white">Level {u.level || 1}</div>
                          <span className="text-[11px] text-[#ffb95f] font-mono">
                            {(u.xp || 0).toLocaleString()} XP
                          </span>
                        </td>

                        {/* Auth Provider */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#131316] border border-white/5 text-[10px] text-[#cbc3d7] uppercase font-mono">
                            {u.authProvider || 'local'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right align-middle w-44">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              onClick={() => openUserDetails(u)}
                              className="admin-action-btn-view h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-[#cbc3d7] hover:text-white border border-white/10 inline-flex items-center justify-center shrink-0 p-0 transition-all cursor-pointer shadow-sm"
                              title="View Stored Data & Details"
                              aria-label="View user details"
                            >
                              <Eye className="w-4 h-4 shrink-0" />
                            </button>

                            {isMasterAdmin ? (
                              <span className="admin-master-badge h-8 w-28 rounded-xl bg-[#a078ff]/15 border border-[#d0bcff]/30 text-[10px] font-bold font-geist text-[#d0bcff] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0">
                                <Crown className="w-3.5 h-3.5 text-[#ffb95f]" /> Master Admin
                              </span>
                            ) : (
                              <button
                                onClick={() => requestToggleStatus(u)}
                                disabled={actionLoading === u.id}
                                className={`h-8 w-28 rounded-xl font-bold font-geist text-[11px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                                  isBlocked
                                    ? 'admin-action-btn-unblock bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                    : 'admin-action-btn-block bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {actionLoading === u.id ? (
                                  <span>Updating...</span>
                                ) : isBlocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 shrink-0" />
                                    <span>Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                    <span>Block</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.isOpen && confirmModal.user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#1f1f22] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      confirmModal.type === 'block'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {confirmModal.type === 'block' ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      <Unlock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-geist text-white">
                      {confirmModal.type === 'block'
                        ? 'Block this account?'
                        : 'Unblock this account?'}
                    </h3>
                    <p className="text-xs text-[#cbc3d7] font-inter">
                      Target: <strong className="text-white">{confirmModal.user.name}</strong> ({confirmModal.user.email})
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#cbc3d7] font-inter leading-relaxed bg-[#131316] p-4 rounded-2xl border border-white/5">
                  {confirmModal.type === 'block' ? (
                    <span>
                      This will prevent the user from accessing HabitForge and remove them from social discovery and leaderboards. Their account and data will remain preserved and can be restored by unblocking.
                    </span>
                  ) : (
                    <span>
                      This will restore the user's access to HabitForge, leaderboards, and social features.
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModal({ isOpen: false, type: 'block', user: null })}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold font-geist text-[#cbc3d7] hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={executeToggleUserStatus}
                    disabled={actionLoading === confirmModal.user.id}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold font-geist tracking-wide uppercase transition-all shadow-lg cursor-pointer ${
                      confirmModal.type === 'block'
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {actionLoading === confirmModal.user.id
                      ? 'Processing...'
                      : confirmModal.type === 'block'
                      ? 'Block Account'
                      : 'Unblock Account'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* User Details Inspection Modal */}
        <AnimatePresence>
          {detailsModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#1f1f22] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#18181b]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#a078ff] to-[#0566d9] flex items-center justify-center font-bold text-white text-lg shadow-md">
                      {detailsModal.user?.name ? detailsModal.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold font-geist text-white">
                          {detailsModal.user?.name}
                        </h3>
                        {detailsModal.data?.user?.status === 'blocked' ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Blocked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                        {detailsModal.data?.user?.isPremium && (
                          <span className="px-2 py-0.5 rounded-md bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/30 text-[10px] font-bold uppercase flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> PRO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#cbc3d7] font-inter">
                        {detailsModal.user?.email} • Joined{' '}
                        {detailsModal.data?.user?.createdAt
                          ? new Date(detailsModal.data.user.createdAt).toLocaleDateString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDetailsModal({ isOpen: false, user: null, loading: false, data: null })}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#cbc3d7] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                  {detailsModal.loading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-[#a078ff] border-t-transparent animate-spin" />
                      <span className="text-xs text-[#cbc3d7]">Loading complete user records...</span>
                    </div>
                  ) : detailsModal.data ? (
                    <>
                      {/* KPI Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#131316] p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase text-[#cbc3d7]">Level</span>
                          <div className="text-xl font-extrabold text-white mt-0.5">
                            Level {detailsModal.data.user?.level || 1}
                          </div>
                        </div>

                        <div className="bg-[#131316] p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase text-[#cbc3d7]">Total XP</span>
                          <div className="text-xl font-extrabold text-[#ffb95f] mt-0.5">
                            {(detailsModal.data.user?.xp || 0).toLocaleString()} XP
                          </div>
                        </div>

                        <div className="bg-[#131316] p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase text-[#cbc3d7]">Completions</span>
                          <div className="text-xl font-extrabold text-[#d0bcff] mt-0.5">
                            {detailsModal.data.stats?.totalCompletions || 0}
                          </div>
                        </div>

                        <div className="bg-[#131316] p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase text-[#cbc3d7]">Friends</span>
                          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                            {detailsModal.data.stats?.friendsCount || 0}
                          </div>
                        </div>
                      </div>

                      {/* Stored Habits List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase font-geist text-[#cbc3d7]">
                            Stored Habits ({detailsModal.data.habits?.length || 0})
                          </h4>
                          <span className="text-[11px] text-[#cbc3d7]/70 font-inter">
                            Data preserved safely regardless of block status
                          </span>
                        </div>

                        {detailsModal.data.habits?.length === 0 ? (
                          <div className="p-4 bg-[#131316] rounded-2xl text-center text-xs text-[#cbc3d7]">
                            No habits created yet.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {detailsModal.data.habits?.map((h) => (
                              <div
                                key={h.id}
                                className="p-3 bg-[#131316] border border-white/5 rounded-xl flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-base">{h.icon || '🎯'}</span>
                                  <div>
                                    <div className="font-bold text-white">{h.title}</div>
                                    <span className="text-[10px] text-[#cbc3d7] capitalize">
                                      {h.category} • {h.frequency}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono text-[11px]">
                                  <span className="text-emerald-400 font-bold">🔥 {h.currentStreak || 0}d streak</span>
                                  <span className="text-[#cbc3d7] block text-[10px]">
                                    {h.totalCompletions || 0} completions
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Badges List */}
                      {detailsModal.data.user?.badges?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase font-geist text-[#cbc3d7]">
                            Earned Badges ({detailsModal.data.user.badges.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.data.user.badges.map((b, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-geist text-[#ffb95f] flex items-center gap-1.5"
                              >
                                <Award className="w-3.5 h-3.5" /> {b.name || b.title || b.id || b}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-xs text-[#cbc3d7]">Failed to load details.</div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-[#18181b] flex items-center justify-between">
                  <span className="text-[11px] text-[#cbc3d7] font-inter">
                    Moderation status is instantly applied across all platform endpoints.
                  </span>

                  {detailsModal.user?.email?.toLowerCase() !== 'sahiljadhav7414@gmail.com' && (
                    <button
                      onClick={() => {
                        const targetUser = detailsModal.data?.user || detailsModal.user;
                        requestToggleStatus(targetUser);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-geist uppercase tracking-wider transition-all cursor-pointer ${
                        detailsModal.data?.user?.status === 'blocked'
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {detailsModal.data?.user?.status === 'blocked' ? (
                        <span className="flex items-center gap-1.5">
                          <Unlock className="w-3.5 h-3.5" /> Unblock Account
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Block Account
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
