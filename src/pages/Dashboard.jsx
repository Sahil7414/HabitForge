import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import UpgradeModal from '../components/UpgradeModal';
import { StatCardSkeleton, HabitCardSkeleton } from '../components/SkeletonLoaders';
import {
  CheckCircle2,
  Flame,
  Trophy,
  Star,
  Check,
  Plus,
  Circle,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES = ['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function HabitCard({ habit, onComplete, isCompleting }) {
  const [ripple, setRipple] = useState(false);

  function handleComplete() {
    if (habit.completedToday || isCompleting) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
    onComplete(habit.id || habit._id);
  }

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-2xl flex items-center justify-between p-4 bg-[#1f1f22] border border-white/5 shadow-md transition-all hover:border-white/10"
      style={{
        opacity: habit.completedToday ? 0.75 : 1,
      }}
    >
      {/* Left Accent Strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{ background: habit.color || '#a078ff' }}
      />

      <div className="flex items-center gap-3 pl-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner"
          style={{ background: `${habit.color || '#a078ff'}20` }}
        >
          {habit.icon || '🏃'}
        </div>
        <div>
          <h4 className="font-bold font-geist text-white text-sm">{habit.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold font-geist text-[#ffb95f] flex items-center gap-1">
              <Flame className="w-3 h-3 fill-[#ffb95f]" /> {habit.currentStreak || 0}d streak
            </span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase">
              {habit.frequency || 'DAILY'}
            </span>
          </div>
        </div>
      </div>

      {/* Completion Button */}
      <button
        onClick={handleComplete}
        disabled={habit.completedToday || isCompleting}
        className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-geist transition-all cursor-pointer ${
          habit.completedToday
            ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 cursor-default'
            : 'bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] shadow-md shadow-[#a078ff]/20'
        }`}
      >
        {ripple && (
          <span className="absolute inset-0 rounded-xl bg-white/30 animate-ping pointer-events-none" />
        )}
        {habit.completedToday ? (
          <>
            <Check className="w-4 h-4" />
            <span>Done Today</span>
          </>
        ) : isCompleting ? (
          <span>Saving...</span>
        ) : (
          <>
            <Circle className="w-4 h-4 stroke-[2.5]" />
            <span>Complete (+10 XP)</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user, habits, completeHabit, addHabit, completingHabits, loading } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Health');
  const [formFrequency, setFormFrequency] = useState('DAILY');
  const [formIcon, setFormIcon] = useState('🏃');
  const [formColor, setFormColor] = useState('#d0bcff');

  function openCreateModal() {
    const activeCount = habits.filter((h) => !h.isArchived).length;
    if (!user.isPremium && activeCount >= 5) {
      setUpgradeModalOpen(true);
      return;
    }
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Health');
    setFormFrequency('DAILY');
    setFormIcon('🏃');
    setFormColor('#d0bcff');
    setModalOpen(true);
  }

  async function handleCreateHabitSubmit(e) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    await addHabit({
      title: formTitle,
      description: formDescription,
      category: formCategory,
      frequency: formFrequency,
      icon: formIcon,
      color: formColor,
    });

    setModalOpen(false);
  }

  const activeHabits = habits.filter((h) => !h.isArchived && !h.isPaused && h.isActive !== false);
  const completedTodayCount = activeHabits.filter((h) => h.completedToday).length;

  const currentStreak = Math.max(0, ...habits.map((h) => h.currentStreak || 0));
  const longestStreak = Math.max(0, ...habits.map((h) => h.longestStreak || 0));

  const xpForNextLevel = (user.level || 1) ** 2 * 100;
  const xpForCurrentLevel = ((user.level || 1) - 1) ** 2 * 100;
  const xpProgress = Math.max(
    0,
    Math.min(
      100,
      (((user.xp || 0) - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
    )
  );

  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <AppLayout>
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName="Unlimited Habits"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Greeting Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-geist text-white tracking-tight flex items-center gap-2">
              {getGreeting()}, {user.name || 'Hero'} 👋
            </h1>
            <p className="text-xs sm:text-sm font-inter text-[#cbc3d7] mt-1">
              Ready to keep your streak alive today?
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#a078ff] text-[#340080] font-extrabold font-geist text-xs uppercase tracking-wider hover:bg-[#d0bcff] transition-all shadow-lg shadow-[#a078ff]/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>

        {/* Level & XP Banner */}
        <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-[#1f1f22] to-[#131316] border border-white/5 shadow-xl overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 90% 20%, #a078ff 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#a078ff] to-[#d0bcff] flex items-center justify-center text-xl sm:text-2xl font-extrabold font-geist text-[#340080] shadow-lg">
                  {user.level || 1}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#ffb95f] flex items-center justify-center text-[10px] text-[#131316] font-bold">
                  ★
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold font-geist text-white">
                    Level {user.level || 1}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#a078ff]/15 text-[#d0bcff] text-[10px] font-extrabold uppercase font-geist">
                    {(user.xp || 0).toLocaleString()} Total XP
                  </span>
                </div>
                <p className="text-xs font-inter text-[#cbc3d7] mt-0.5">
                  {Math.max(0, xpForNextLevel - (user.xp || 0))} XP needed for Level {(user.level || 1) + 1}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full md:w-80 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold font-geist text-[#cbc3d7]">
                <span>Progress</span>
                <span>{Math.round(xpProgress)}%</span>
              </div>
              <div className="h-3 rounded-full bg-[#353438] overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#a078ff] to-[#d0bcff] rounded-full transition-all duration-700 shadow-[0_0_10px_#a078ff]"
                  style={{ width: `${Math.min(100, xpProgress)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">Today's Progress</span>
                  <div className="text-2xl font-extrabold font-geist text-white mt-1">
                    {completedTodayCount} <span className="text-sm font-normal text-[#cbc3d7]">/ {activeHabits.length}</span>
                  </div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
              </div>

              <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">Current Streak</span>
                  <div className="text-2xl font-extrabold font-geist text-[#ffb95f] mt-1">
                    {currentStreak} <span className="text-sm font-normal text-[#cbc3d7]">days</span>
                  </div>
                </div>
                <Flame className="w-6 h-6 text-[#ffb95f] fill-[#ffb95f]" />
              </div>

              <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">Best Streak</span>
                  <div className="text-2xl font-extrabold font-geist text-[#ffb95f] mt-1">
                    {longestStreak} <span className="text-sm font-normal text-[#cbc3d7]">days</span>
                  </div>
                </div>
                <Trophy className="w-6 h-6 text-[#ffb95f]" />
              </div>

              <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">Total XP</span>
                  <div className="text-2xl font-extrabold font-geist text-[#d0bcff] mt-1">
                    {(user.xp || 0).toLocaleString()}
                  </div>
                </div>
                <Star className="w-6 h-6 text-[#d0bcff] fill-[#d0bcff]" />
              </div>
            </>
          )}
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Habits Section */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-geist text-white">
                Today's Habits
              </h2>
              <Link
                to="/habits"
                className="text-xs font-bold font-geist text-[#d0bcff] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>VIEW ALL</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <HabitCardSkeleton key={i} />)
              ) : activeHabits.length === 0 ? (
                <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#a078ff]/10 text-[#a078ff] flex items-center justify-center mx-auto text-2xl">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-geist text-white">No habits created yet</h3>
                  <p className="text-xs text-[#cbc3d7] font-inter max-w-sm mx-auto">
                    Start forging your daily routine! Create your first habit to begin building your consistency graph.
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-xs uppercase tracking-wider shadow-lg hover:bg-[#d0bcff] transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>CREATE YOUR FIRST HABIT</span>
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {activeHabits.map((h) => (
                    <HabitCard
                      key={h.id || h._id}
                      habit={h}
                      onComplete={completeHabit}
                      isCompleting={!!completingHabits[h.id || h._id]}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Sidebar Info Cards */}
          <div className="xl:col-span-4 space-y-6">
            {/* Weekly Consistency */}
            <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold font-geist text-[#cbc3d7] tracking-widest uppercase">
                WEEKLY CONSISTENCY
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, i) => {
                  const isPast = i < dayIndex;
                  const isToday = i === dayIndex;
                  return (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <span
                        className={`text-[10px] font-bold font-geist uppercase ${
                          isToday ? 'text-[#d0bcff]' : 'text-[#cbc3d7]'
                        }`}
                      >
                        {day}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isPast
                            ? 'bg-[#a078ff]/20 text-[#d0bcff] border border-[#a078ff]/40'
                            : isToday
                            ? 'bg-[#d0bcff]/20 border-2 border-[#d0bcff] text-white shadow-[0_0_10px_rgba(208,188,255,0.4)]'
                            : 'bg-[#353438] text-white/20'
                        }`}
                      >
                        {isPast ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isToday ? (
                          <span className="w-2 h-2 rounded-full bg-[#d0bcff] animate-ping" />
                        ) : (
                          <Circle className="w-4 h-4 stroke-[1.5]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements Preview */}
            <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-geist text-[#cbc3d7] tracking-widest uppercase">
                  UNLOCKED BADGES
                </h3>
                <Link to="/achievements" className="text-xs font-bold font-geist text-[#d0bcff] hover:text-white">
                  VIEW ALL
                </Link>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {user.badges && user.badges.length > 0 ? (
                  user.badges.map((badgeId, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-2xl bg-[#131316] border border-[#d0bcff]/30 flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    >
                      ⭐
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#cbc3d7] font-geist">Complete habits to unlock badges!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Creation Modal directly on Dashboard */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg rounded-3xl p-6 md:p-8 bg-[#1f1f22] border border-white/10 shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold font-geist text-white">Create New Habit</h2>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-[#cbc3d7] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateHabitSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                    Title
                  </label>
                  <input
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Morning Exercise"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. 30 min workout to start the day strong"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                      Frequency
                    </label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                      Icon Emoji
                    </label>
                    <input
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#131316] border border-white/10 text-white text-center font-inter text-base outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
                      Color Hex
                    </label>
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full h-10 rounded-xl bg-[#131316] border border-white/10 p-1 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#a078ff] text-[#340080] font-extrabold font-geist text-xs uppercase tracking-wider hover:bg-[#d0bcff] transition-all cursor-pointer"
                  >
                    Create Habit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
