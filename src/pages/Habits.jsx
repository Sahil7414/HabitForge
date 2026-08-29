import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import HabitStatsModal from '../components/HabitStatsModal';
import UpgradeModal from '../components/UpgradeModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Flame,
  X,
  Play,
  Pause,
  Archive,
  RotateCcw,
  BarChart2,
} from 'lucide-react';

const CATEGORIES = ['All', 'Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal'];

export default function Habits() {
  const { user, habits, addHabit, editHabit, deleteHabit } = useAuth();

  const [activeTab, setActiveTab] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [statsHabit, setStatsHabit] = useState(null);
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

    setEditingHabit(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Health');
    setFormFrequency('DAILY');
    setFormIcon('🏃');
    setFormColor('#d0bcff');
    setModalOpen(true);
  }

  function openEditModal(habit) {
    setEditingHabit(habit);
    setFormTitle(habit.title);
    setFormDescription(habit.description || '');
    setFormCategory(habit.category || 'Health');
    setFormFrequency(habit.frequency);
    setFormIcon(habit.icon || '🏃');
    setFormColor(habit.color || '#d0bcff');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle,
      description: formDescription,
      category: formCategory,
      frequency: formFrequency,
      icon: formIcon,
      color: formColor,
    };

    if (editingHabit) {
      await editHabit(editingHabit.id || editingHabit._id, payload);
    } else {
      await addHabit(payload);
    }

    setModalOpen(false);
  }

  // Filter habits
  const filteredHabits = habits.filter((h) => {
    if (activeTab === 'active' && (h.isArchived || h.isPaused)) return false;
    if (activeTab === 'paused' && (!h.isPaused || h.isArchived)) return false;
    if (activeTab === 'archived' && !h.isArchived) return false;

    if (categoryFilter !== 'All' && h.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = h.title.toLowerCase().includes(q);
      const matchDesc = h.description && h.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  return (
    <AppLayout>
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName="Unlimited Habits"
      />

      <HabitStatsModal
        habit={statsHabit}
        isOpen={!!statsHabit}
        onClose={() => setStatsHabit(null)}
      />

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-geist text-white tracking-tight">
              Manage Habits
            </h1>
            <p className="text-base text-[#cbc3d7] font-inter mt-1.5">
              Organize, track, and optimize your daily and weekly routines.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#a078ff] text-[#340080] font-extrabold font-geist text-xs uppercase tracking-wider hover:bg-[#d0bcff] transition-all shadow-lg cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>

        {/* Tab & Category Filtering Controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            {/* Status Tabs */}
            <div className="flex gap-2">
              {[
                { id: 'active', label: 'Active Habits' },
                { id: 'paused', label: 'Paused' },
                { id: 'archived', label: 'Archived' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-geist transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#353438] text-white border border-white/10 shadow-sm'
                      : 'text-[#cbc3d7] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1f1f22] border border-white/10 text-white font-inter text-xs outline-none focus:border-[#d0bcff]"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-geist transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#a078ff] text-[#340080]'
                    : 'bg-[#1f1f22] text-[#cbc3d7] border border-white/5 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Habits Grid */}
        {filteredHabits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHabits.map((habit) => {
              const hId = habit.id || habit._id;
              const dropdownOpen = activeDropdown === hId;

              return (
                <motion.div
                  key={hId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative bg-[#1f1f22] border border-white/5 hover:border-[#d0bcff]/30 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                          style={{ background: `${habit.color || '#a078ff'}20`, border: `1px solid ${habit.color}` }}
                        >
                          {habit.icon || '🏃'}
                        </div>
                        <div>
                          <h3 className="font-bold font-geist text-white text-base truncate max-w-[160px]">
                            {habit.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase">
                              {habit.frequency}
                            </span>
                            <span className="text-[10px] text-white/30">•</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-geist bg-white/5 text-[#d0bcff]">
                              {habit.category || 'Health'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3-Dot Options Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(dropdownOpen ? null : hId)}
                          className="p-2 rounded-xl text-[#cbc3d7] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {dropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                className="absolute right-0 top-10 w-40 rounded-2xl bg-[#2a2a2d] border border-white/10 shadow-2xl p-1.5 z-50 space-y-1"
                              >
                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    setStatsHabit(habit);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-geist text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  <BarChart2 className="w-4 h-4 text-[#d0bcff]" />
                                  <span>Inspect Stats</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    openEditModal(habit);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-geist text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4 text-[#ffb95f]" />
                                  <span>Edit Habit</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    editHabit(hId, { isPaused: !habit.isPaused });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-geist text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  {habit.isPaused ? <Play className="w-4 h-4 text-[#10b981]" /> : <Pause className="w-4 h-4 text-[#ffb95f]" />}
                                  <span>{habit.isPaused ? 'Resume' : 'Pause'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    editHabit(hId, { isArchived: !habit.isArchived });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-geist text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  {habit.isArchived ? <RotateCcw className="w-4 h-4 text-[#10b981]" /> : <Archive className="w-4 h-4 text-[#cbc3d7]" />}
                                  <span>{habit.isArchived ? 'Unarchive' : 'Archive'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    deleteHabit(hId);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-geist text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                  <span>Delete</span>
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {habit.description && (
                      <p className="text-xs text-[#cbc3d7] font-inter line-clamp-2 leading-relaxed">
                        {habit.description}
                      </p>
                    )}
                  </div>

                  {/* Streak & Stats Footer */}
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-geist text-[#ffb95f]">
                      <Flame className="w-4 h-4 fill-[#ffb95f]" />
                      <span>{habit.currentStreak || 0} Day Streak</span>
                    </div>

                    <button
                      onClick={() => setStatsHabit(habit)}
                      className="text-xs font-bold font-geist text-[#d0bcff] hover:underline cursor-pointer"
                    >
                      {habit.totalCompletions || 0} completions
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-12 text-center space-y-4">
            <p className="text-sm font-geist text-[#cbc3d7]">No habits found in this category or tab.</p>
            <button
              onClick={openCreateModal}
              className="px-6 py-2.5 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-xs uppercase cursor-pointer"
            >
              Create First Habit
            </button>
          </div>
        )}
      </div>

      {/* Habit Create / Edit Modal */}
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
                <h2 className="text-xl font-bold font-geist text-white">
                  {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-[#cbc3d7] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
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
                    {editingHabit ? 'Save Changes' : 'Create Habit'}
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
