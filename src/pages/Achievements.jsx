import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Award, Lock, Trophy, Flame, Check, Info, Sparkles } from 'lucide-react';

const CATEGORIES = ['All Achievements', 'Streaks', 'Milestones', 'Special Events'];

function BadgeCard({ badge, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className={`badge-card relative flex flex-col justify-between p-6 rounded-2xl border transition-all ${
        badge.unlocked
          ? 'badge-card-unlocked bg-[#1f1f22] border-[#d0bcff]/30 shadow-lg hover:-translate-y-1 hover:border-[#d0bcff]/60'
          : 'badge-card-locked bg-[#1b1b1e] border-white/5 opacity-75'
      }`}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${
              badge.unlocked
                ? 'bg-[#a078ff]/20 border border-[#d0bcff]/40'
                : 'badge-lock-icon-box bg-[#353438] border border-white/10'
            }`}
          >
            {badge.unlocked ? (
              badge.icon
            ) : (
              <Lock className="w-6 h-6 text-[#cbc3d7]" />
            )}
          </div>

          <span
            className={`text-[10px] font-bold font-geist px-2.5 py-1 rounded-lg tracking-wider uppercase ${
              badge.unlocked
                ? 'bg-[#a078ff]/20 text-[#d0bcff] border border-[#d0bcff]/30'
                : 'badge-locked-pill bg-[#353438] text-[#cbc3d7]'
            }`}
          >
            {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
          </span>
        </div>

        <h3 className="text-lg font-bold font-geist text-white mb-1">
          {badge.name}
        </h3>
        <p className="text-xs font-inter text-[#cbc3d7] leading-relaxed">
          {badge.description}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-white/5">
        {!badge.unlocked && badge.progress !== undefined ? (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-[#353438] overflow-hidden badge-progress-track">
              <div
                className="h-full bg-[#cbc3d7] rounded-full badge-progress-fill"
                style={{ width: `${(badge.progress / badge.target) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold font-geist text-[#cbc3d7]">
              <span>PROGRESS</span>
              <span>
                {badge.progress} / {badge.target}
              </span>
            </div>
          </div>
        ) : badge.unlocked ? (
          <span className="text-[10px] font-bold font-geist text-[#10b981] flex items-center gap-1 uppercase tracking-wider">
            <Check className="w-3.5 h-3.5 stroke-[3]" /> Completed
          </span>
        ) : (
          <span className="text-[10px] font-bold font-geist text-[#cbc3d7] flex items-center gap-1 uppercase tracking-wider">
            <Info className="w-3.5 h-3.5" /> Locked
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const { user, allBadges } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All Achievements');
  const unlockedCount = allBadges.filter((b) => b.unlocked).length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Banner */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-geist text-white tracking-tight">
              Achievements
            </h1>
            <p className="text-sm sm:text-base text-[#cbc3d7] font-inter mt-1.5">
              Every streak tells a story. Celebrate your progress and milestones.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-[#131316] border border-white/10 px-6 py-4 rounded-2xl">
            <div>
              <p className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                Total Unlocked
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-extrabold font-geist text-[#d0bcff]">
                  {unlockedCount}
                </span>
                <span className="text-xs text-[#cbc3d7]">
                  / {allBadges.length}
                </span>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                Current Level
              </p>
              <span className="text-2xl font-extrabold font-geist text-[#ffb95f] mt-0.5 block">
                {user.level}
              </span>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`achievement-cat-pill px-5 py-2.5 rounded-full text-xs font-bold font-geist tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'active bg-[#a078ff] text-[#340080] shadow-md shadow-[#a078ff]/20 font-extrabold'
                  : 'inactive bg-[#1b1b1e] text-[#cbc3d7] border border-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {allBadges
            .filter((b) => activeCategory === 'All Achievements' || b.category === activeCategory)
            .map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} />
            ))}
        </div>
      </div>
    </AppLayout>
  );
}
