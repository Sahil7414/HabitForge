import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  LineChart,
  Award,
  User,
  Users,
  Trophy,
  Crown,
  Settings,
  LogOut,
  Flame,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/habits', Icon: CheckSquare, label: 'My Habits' },
  { path: '/analytics', Icon: LineChart, label: 'Analytics' },
  { path: '/social', Icon: Users, label: 'Social' },
  { path: '/leaderboard', Icon: Trophy, label: 'Leaderboard' },
  { path: '/achievements', Icon: Award, label: 'Achievements' },
  { path: '/premium', Icon: Crown, label: 'Premium' },
  { path: '/profile', Icon: User, label: 'Profile' },
  { path: '/settings', Icon: Settings, label: 'Settings' },
];

function levelTitle(level) {
  if (level < 5) return 'Initiate';
  if (level < 10) return 'Apprentice';
  if (level < 15) return 'Adept';
  if (level < 20) return 'Expert';
  return 'Master';
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AR';

  function handleLogout() {
    logout();
    navigate('/');
  }

  const xpForNextLevel = (user.level) ** 2 * 100;
  const xpForCurrentLevel = (user.level - 1) ** 2 * 100;
  const progress = Math.max(0, Math.min(100, ((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  const isPremiumActive =
    user?.isPremium &&
    (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col border-r shadow-2xl"
      style={{
        background: '#0e0e11',
        borderColor: 'rgba(73,68,84,0.2)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #6d3bd7 0%, #a078ff 100%)',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(160, 120, 255, 0.4)',
            }}
          >
            ⚒
          </div>
          <span className="text-xl font-bold tracking-tight font-geist text-white">
            HabitForge
          </span>
        </div>
        {isPremiumActive && (
          <span className="px-2 py-0.5 rounded-full bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] text-[10px] font-extrabold font-geist">
            PRO
          </span>
        )}
      </div>


      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ path, Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-[#a078ff]/20 text-[#d0bcff] border border-[#d0bcff]/30 shadow-[0_0_15px_rgba(160,120,255,0.15)] font-semibold'
                  : 'text-[#cbc3d7] hover:text-white hover:bg-[#353438]/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#d0bcff]' : 'text-[#cbc3d7]'}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile & footer */}
      <div className="px-4 py-4 border-t border-white/5 space-y-3 bg-[#131316]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-sm font-medium text-[#cbc3d7] hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Sign Out</span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/5 bg-[#1f1f22]">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white shadow"
            style={{
              background: 'linear-gradient(135deg, #a078ff, #0566d9)',
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold font-geist text-white truncate uppercase tracking-wider flex items-center gap-1">
              {user.name ? user.name.split(' ')[0] : 'User'}
            </span>
            <span className="text-[11px] font-medium font-geist text-[#d0bcff] flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#ffb95f]" /> LVL {user.level} · {levelTitle(user.level)}
            </span>
          </div>
        </div>

        {/* XP Mini Bar */}
        <div className="px-1 pt-1">
          <div className="flex justify-between text-[11px] font-geist font-medium text-[#cbc3d7] mb-1.5">
            <span>{user.xp.toLocaleString()} XP</span>
            <span>LVL {user.level + 1}</span>
          </div>
          <div className="h-2 rounded-full bg-[#353438] overflow-hidden">
            <div
              className="h-full rounded-full xp-bar-fill transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
