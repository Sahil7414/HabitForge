import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Award,
  Star,
  Flame,
  Trophy,
  CheckCircle2,
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Crown,
} from 'lucide-react';

function levelTitle(level) {
  if (level <= 2) return 'Initiate';
  if (level <= 4) return 'Apprentice';
  if (level <= 7) return 'Adept';
  if (level <= 10) return 'Veteran';
  if (level <= 15) return 'Expert';
  if (level <= 20) return 'Master';
  return 'Grandmaster';
}

export default function Profile() {
  const { user, allBadges, showNotification, cancelPremium, refreshData } = useAuth();
  const unlocked = allBadges.filter((b) => b.unlocked);

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'AR';

  const xpForNextLevel = (user.level || 1) ** 2 * 100;
  const xpForCurrentLevel = ((user.level || 1) - 1) ** 2 * 100;
  const xpProgress = Math.max(
    0,
    Math.min(
      100,
      (((user.xp || 0) - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
    )
  );

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    showNotification({ type: 'habit_added', title: 'Profile details saved!' });
  }

  async function handleCancelMembership() {
    if (!window.confirm('Are you sure you want to cancel your Premium membership? You will lose PRO benefits.')) return;
    try {
      setCancelling(true);
      await cancelPremium();
      await refreshData();
    } finally {
      setCancelling(false);
    }
  }

  const stats = [
    {
      label: 'Current Level',
      value: user.level || 1,
      Icon: Award,
      color: '#d0bcff',
    },
    {
      label: 'Total XP',
      value: (user.xp || 0).toLocaleString(),
      Icon: Star,
      color: '#d0bcff',
    },
    {
      label: 'Current Streak',
      value: `${user.currentStreak || 0}d`,
      Icon: Flame,
      color: '#ffb95f',
    },
    {
      label: 'Best Streak',
      value: `${user.longestStreak || 0}d`,
      Icon: Trophy,
      color: '#ffb95f',
    },
    {
      label: 'Total Completions',
      value: user.totalCompletions || 0,
      Icon: CheckCircle2,
      color: '#adc6ff',
    },
    {
      label: 'Badges Earned',
      value: unlocked.length,
      Icon: Award,
      color: '#10b981',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold font-geist text-white tracking-tight">
          Profile
        </h1>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 md:p-8 bg-[#1f1f22] border border-white/5 shadow-xl overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 85% 15%, #a078ff 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="relative flex-shrink-0">
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center text-4xl font-extrabold font-geist text-white shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #a078ff, #0566d9)',
                }}
              >
                {initials}
              </div>
              {user.isPremium ? (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#ffb95f] flex items-center justify-center text-[#131316] shadow-md">
                  <Crown className="w-5 h-5 fill-[#131316]" />
                </div>
              ) : (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#ffb95f] flex items-center justify-center text-[#131316] shadow-md">
                  <Star className="w-4 h-4 fill-[#131316]" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-bold font-geist text-white flex items-center gap-2">
                    {name} {user.isPremium && <span className="px-2.5 py-0.5 rounded-full bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] text-xs font-extrabold font-geist">PRO</span>}
                  </h2>
                  <p className="text-sm font-inter text-[#cbc3d7] mt-1">
                    {email}
                  </p>
                </div>

                {user.isPremium ? (
                  <button
                    onClick={handleCancelMembership}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs hover:bg-red-500/20 transition-all cursor-pointer self-center sm:self-auto"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Membership'}
                  </button>
                ) : (
                  <Link
                    to="/premium"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#a078ff] to-[#d0bcff] text-[#340080] font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition-all self-center sm:self-auto"
                  >
                    UPGRADE TO PRO
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#a078ff]/15 border border-[#d0bcff]/30 text-[#d0bcff] text-xs font-bold font-geist">
                  <Award className="w-4 h-4" />
                  Level {user.level || 1} — {levelTitle(user.level || 1)}
                </span>
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ffb95f]/15 border border-[#ffb95f]/30 text-[#ffb95f] text-xs font-bold font-geist">
                  <Flame className="w-4 h-4 fill-[#ffb95f]" />
                  {user.currentStreak || 0} Day Streak
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-1.5 max-w-md pt-1">
                <div className="flex justify-between text-xs font-bold font-geist text-[#cbc3d7]">
                  <span>{(user.xp || 0).toLocaleString()} XP</span>
                  <span>
                    Level {(user.level || 1) + 1} → {xpForNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#353438] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#a078ff] to-[#d0bcff] rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, xpProgress)}%`,
                      boxShadow: '0 0 10px rgba(208,188,255,0.5)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 6 Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:-translate-y-1 transition-all"
            >
              <Icon className="w-5 h-5" style={{ color }} />
              <div>
                <span className="text-2xl font-extrabold font-geist text-white block">
                  {value}
                </span>
                <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Badges Collection */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-geist text-white">
              Badge Collection
            </h2>
            <span className="text-xs font-bold font-geist text-[#cbc3d7]">
              {unlocked.length} / {allBadges.length} UNLOCKED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {allBadges.map((b) => (
              <div
                key={b.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all ${
                  b.unlocked
                    ? 'bg-[#131316] border-[#d0bcff]/30 shadow-md hover:scale-105'
                    : 'bg-[#131316]/50 border-white/5 opacity-50 grayscale'
                }`}
              >
                <div className="text-2xl">{b.unlocked ? b.icon : '🔒'}</div>
                <span className="text-[10px] font-bold font-geist text-white truncate w-full">
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Profile Settings Form */}
        <form onSubmit={handleSaveProfile} className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold font-geist text-white">
            Account Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3.5" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Account Status
              </label>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[#10b981]" />
                  <span>{user.isPremium ? 'Active • Premium Tier (PRO)' : 'Active • Free Tier'}</span>
                </div>
                {user.isPremium && (
                  <button
                    type="button"
                    onClick={handleCancelMembership}
                    disabled={cancelling}
                    className="text-xs text-red-400 font-bold hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Member Since
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm">
                <Calendar className="w-4 h-4 text-[#cbc3d7]" />
                <span>August 2026</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-xs tracking-wider uppercase hover:bg-[#d0bcff] transition-all shadow-lg shadow-[#a078ff]/20 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
