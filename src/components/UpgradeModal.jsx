import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Crown, Check, X } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, featureName = 'Unlimited Habits' }) {
  const navigate = useNavigate();
  if (!isOpen) return null;

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
          className="relative w-[calc(100%-32px)] max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-[#1f1f22] border border-[#d0bcff]/40 text-center space-y-6 shadow-[0_0_60px_rgba(208,188,255,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#a078ff] to-[#d0bcff] flex items-center justify-center shadow-lg shadow-[#a078ff]/30">
              <Crown className="w-8 h-8 text-[#340080]" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-extrabold font-geist text-[#ffb95f] tracking-widest uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> PREMIUM FEATURE UNLOCK
            </span>
            <h2 className="text-2xl font-bold font-geist text-white">
              Upgrade for {featureName}
            </h2>
            <p className="text-xs font-inter text-[#cbc3d7]">
              Free accounts are limited to 5 active habits and basic analytics.
            </p>
          </div>

          <div className="bg-[#131316] border border-white/5 rounded-2xl p-4 text-left space-y-2 text-xs font-inter text-[#cbc3d7]">
            <div className="flex items-center gap-2 font-bold font-geist text-white">
              <Check className="w-4 h-4 text-[#10b981]" /> Unlimited Habit Creation
            </div>
            <div className="flex items-center gap-2 font-bold font-geist text-white">
              <Check className="w-4 h-4 text-[#10b981]" /> Full 365-Day Activity Heatmap
            </div>
            <div className="flex items-center gap-2 font-bold font-geist text-white">
              <Check className="w-4 h-4 text-[#10b981]" /> CSV Data Export
            </div>
            <div className="flex items-center gap-2 font-bold font-geist text-white">
              <Check className="w-4 h-4 text-[#10b981]" /> Advanced Time Range Analytics
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                navigate('/premium');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#a078ff] to-[#d0bcff] text-[#340080] font-extrabold font-geist text-xs tracking-wider uppercase shadow-xl hover:scale-105 transition-transform cursor-pointer"
            >
              UPGRADE TO PREMIUM NOW
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
