import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  Trophy,
  Flame,
  Star,
  PlusCircle,
  LogIn,
  ShieldCheck,
} from 'lucide-react';

const FEATURES = [
  {
    Icon: Flame,
    title: 'Streaks',
    desc: 'Build momentum with daily & weekly streak counters.',
    color: '#ffb95f',
  },
  {
    Icon: Star,
    title: 'XP & Levels',
    desc: 'Earn experience points for every completion and level up.',
    color: '#d0bcff',
  },
  {
    Icon: Trophy,
    title: 'Achievements',
    desc: 'Unlock milestone badges for consistency and mastery.',
    color: '#adc6ff',
  },
  {
    Icon: TrendingUp,
    title: 'Analytics',
    desc: 'Visualize progress with 30-day charts and activity heatmaps.',
    color: '#10b981',
  },
];

const STEPS = [
  {
    num: '01',
    Icon: PlusCircle,
    title: 'Create',
    desc: 'Define your habits, select frequency, icon, and colors.',
  },
  {
    num: '02',
    Icon: CheckCircle2,
    title: 'Complete',
    desc: 'Check off daily habits with a single tap to build streaks.',
  },
  {
    num: '03',
    Icon: TrendingUp,
    title: 'Level Up',
    desc: 'Earn XP for consistency and advance your player level.',
  },
  {
    num: '04',
    Icon: Trophy,
    title: 'Achieve',
    desc: 'Unlock unique achievement badges as you maintain your routine.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#131316] text-[#e4e1e6] flex flex-col font-inter">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#131316]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6d3bd7] to-[#a078ff] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#a078ff]/20">
            ⚒
          </div>
          <span className="text-xl font-bold font-geist text-white tracking-tight">
            HabitForge
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold font-geist text-[#cbc3d7] hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl text-sm font-bold font-geist bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] transition-all shadow-lg shadow-[#a078ff]/20"
          >
            Start Forging
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-8 flex items-center justify-center min-h-[90vh] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#a078ff]/15 via-[#131316] to-[#131316]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#1f1f22] border border-white/10 rounded-full px-4 py-2 text-xs font-bold font-geist text-[#cbc3d7] tracking-wider uppercase"
          >
            <ShieldCheck className="w-4 h-4 text-[#d0bcff]" />
            <span>HabitForge Beta Now Live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold font-geist text-white tracking-tight leading-[1.1]"
          >
            Forge Better Habits. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d0bcff] to-[#adc6ff]">
              Level Up Your Life.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#cbc3d7] max-w-2xl mx-auto leading-relaxed"
          >
            Turn everyday consistency into XP, streaks, achievements, and real progress. The professional operating system for your personal growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4"
          >
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#a078ff] text-[#340080] font-bold font-geist text-base hover:bg-[#d0bcff] transition-all shadow-xl shadow-[#a078ff]/25 hover:scale-105"
            >
              <span>Start Forging</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#1f1f22] border border-white/10 text-white font-bold font-geist text-base hover:bg-[#353438] transition-all"
            >
              <LogIn className="w-5 h-5 text-[#cbc3d7]" />
              <span>Sign In</span>
            </Link>
          </motion.div>

          <div className="pt-12 grid grid-cols-3 gap-8 max-w-md mx-auto border-t border-white/5">
            <div>
              <span className="text-3xl font-extrabold font-geist text-white block">
                10K+
              </span>
              <span className="text-xs font-geist text-[#cbc3d7] uppercase tracking-wider">
                Users
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold font-geist text-[#d0bcff] block">
                2M+
              </span>
              <span className="text-xs font-geist text-[#cbc3d7] uppercase tracking-wider">
                Completions
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold font-geist text-white block">
                98%
              </span>
              <span className="text-xs font-geist text-[#cbc3d7] uppercase tracking-wider">
                Retention
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8 bg-[#0e0e11] border-t border-b border-white/5">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-extrabold font-geist text-white">
              Built for Champions
            </h2>
            <p className="text-base text-[#cbc3d7] max-w-xl mx-auto">
              Every feature is engineered to make habit building engaging, rewarding, and consistent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4 hover:-translate-y-1 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#131316]"
                  style={{ border: `1px solid ${color}40` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <h3 className="text-xl font-bold font-geist text-white">
                  {title}
                </h3>
                <p className="text-sm text-[#cbc3d7] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-extrabold font-geist text-white">
              The Forging Process
            </h2>
            <p className="text-base text-[#cbc3d7] max-w-xl mx-auto">
              A systematic approach to building consistency and achieving mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ num, Icon, title, desc }) => (
              <div
                key={num}
                className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 text-center space-y-4 hover:-translate-y-1 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#a078ff]/15 border border-[#d0bcff]/30 mx-auto flex items-center justify-center text-[#d0bcff]">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold font-geist text-[#d0bcff] tracking-widest">
                  STEP {num}
                </div>
                <h3 className="text-xl font-bold font-geist text-white">
                  {title}
                </h3>
                <p className="text-sm text-[#cbc3d7] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-white/5 text-center text-xs text-[#cbc3d7] font-inter">
        © 2026 HabitForge • Gamified Habit Tracker Application
      </footer>
    </div>
  );
}
