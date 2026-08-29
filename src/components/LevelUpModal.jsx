import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Flame, Sparkles, X, Check } from 'lucide-react';

function getLevelTitle(level) {
  if (level <= 2) return 'Initiate';
  if (level <= 4) return 'Apprentice';
  if (level <= 7) return 'Adept';
  if (level <= 10) return 'Veteran';
  if (level <= 15) return 'Expert';
  if (level <= 20) return 'Master';
  return 'Grandmaster';
}

export default function LevelUpModal({ level, onClose }) {
  if (!level) return null;
  const title = getLevelTitle(level);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-[calc(100%-32px)] max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-[#1f1f22] border border-[#d0bcff]/40 text-center space-y-6 shadow-[0_0_80px_rgba(208,188,255,0.3)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing background radial */}
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,_#a078ff_0%,_transparent_70%)]" />

          {/* Sparkles Icon */}
          <div className="relative z-10 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#a078ff]/20 border-2 border-[#d0bcff] flex items-center justify-center shadow-[0_0_30px_rgba(208,188,255,0.5)] animate-pulse">
              <Trophy className="w-10 h-10 text-[#d0bcff]" />
            </div>
          </div>

          <div className="relative z-10 space-y-2">
            <span className="text-xs font-bold font-geist text-[#ffb95f] tracking-widest uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" /> LEVEL UP UNLOCKED <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-4xl font-extrabold font-geist text-white tracking-tight">
              Level {level} Achieved!
            </h2>
            <p className="text-sm font-geist text-[#d0bcff] font-semibold">
              New Rank: <span className="text-white underline">{title}</span>
            </p>
          </div>

          <div className="relative z-10 bg-[#131316] border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs font-inter text-[#cbc3d7]">
            <div className="flex items-center gap-2 text-white font-semibold font-geist">
              <Star className="w-4 h-4 text-[#ffb95f]" />
              <span>Rank Benefits & Unlocks:</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc">
              <li>Increased daily XP multiplier bonus</li>
              <li>Unlocked rank status badge: <strong className="text-[#d0bcff]">{title}</strong></li>
              <li>Consistency streak protection enabled</li>
            </ul>
          </div>

          <div className="relative z-10 pt-2">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#a078ff] to-[#d0bcff] text-[#340080] font-extrabold font-geist text-sm tracking-wider uppercase shadow-xl hover:scale-105 transition-transform cursor-pointer"
            >
              CONTINUE FORGING
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
