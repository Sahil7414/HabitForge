import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { habitsAPI } from '../services/api';
import { X, Flame, Trophy, CheckCircle2, Calendar, Tag } from 'lucide-react';

export default function HabitStatsModal({ habit, isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && habit) {
      const habitId = habit.id || habit._id;
      setLoading(true);
      habitsAPI
        .getHistory(habitId)
        .then((res) => setHistory(res.data))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, habit]);

  if (!isOpen || !habit) return null;

  const totalCompletions = history.length || habit.totalCompletions || 0;
  const lastDate = habit.lastCompletedDate || (history[0] ? history[0].completionDate : 'Never');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg rounded-3xl p-6 md:p-8 bg-[#1f1f22] border border-white/10 space-y-6 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
              style={{ background: `${habit.color || '#a078ff'}20`, border: `1px solid ${habit.color}` }}
            >
              {habit.icon || '🏃'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-geist text-white">{habit.title}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-geist bg-white/5 border border-white/10 text-[#d0bcff]">
                  {habit.category || 'Health'}
                </span>
              </div>
              <p className="text-xs font-inter text-[#cbc3d7] mt-1">{habit.description || 'No description provided.'}</p>
            </div>
          </div>

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#131316] border border-white/5 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7]">
                <span>Current Streak</span>
                <Flame className="w-4 h-4 text-[#ffb95f]" />
              </div>
              <span className="text-2xl font-extrabold font-geist text-[#ffb95f]">
                {habit.currentStreak || 0} days
              </span>
            </div>

            <div className="bg-[#131316] border border-white/5 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7]">
                <span>Best Streak</span>
                <Trophy className="w-4 h-4 text-[#d0bcff]" />
              </div>
              <span className="text-2xl font-extrabold font-geist text-white">
                {habit.longestStreak || 0} days
              </span>
            </div>

            <div className="bg-[#131316] border border-white/5 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7]">
                <span>Total Completions</span>
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
              </div>
              <span className="text-2xl font-extrabold font-geist text-white">
                {totalCompletions}
              </span>
            </div>

            <div className="bg-[#131316] border border-white/5 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7]">
                <span>Last Completed</span>
                <Calendar className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <span className="text-sm font-bold font-geist text-white truncate block">
                {lastDate}
              </span>
            </div>
          </div>

          {/* Completion Logs Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold font-geist text-white">Completion History</h3>
            {loading ? (
              <p className="text-xs text-[#cbc3d7]">Loading history...</p>
            ) : history.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {history.slice(0, 15).map((log) => (
                  <div
                    key={log._id || log.completionDate}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#131316] border border-white/5 text-xs text-[#cbc3d7]"
                  >
                    <span className="font-geist font-semibold text-white">{log.completionDate}</span>
                    <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                      ✓ Completed (+10 XP)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#cbc3d7]">No completions logged yet.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
