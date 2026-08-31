import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_CATEGORIES = [
  {
    name: 'Popular',
    emojis: ['🏃', '💧', '📚', '💻', '🧘', '⚡', '🔥', '🎯', '🥗', '🍎', '🏋️', '🛌'],
  },
  {
    name: 'Fitness',
    emojis: ['🏃', '🏋️', '🚴', '🏊', '🧘', '🧗', '🥊', '⚽', '🏀', '🎾', '🚶', '🤸', '🏄', '🥋'],
  },
  {
    name: 'Health',
    emojis: ['💧', '🥗', '🍎', '🥑', '💊', '🛌', '🍵', '🥕', '🥦', '🍉', '🍳', '🥛', '🫐', '🍇'],
  },
  {
    name: 'Learning',
    emojis: ['📚', '💻', '✍️', '🧠', '🎯', '📖', '🎓', '🔬', '🔭', '📝', '🎨', '💡', '🧪', '📐'],
  },
  {
    name: 'Mindfulness',
    emojis: ['🧘‍♂️', '🌿', '🕯️', '🌅', '🕊️', '🌸', '🌊', '⛰️', '🌳', '☀️', '🍃', '🌺', '🌙', '🌌'],
  },
  {
    name: 'Productivity',
    emojis: ['⚡', '⏱️', '📈', '💼', '🚀', '📅', '📋', '📊', '🛠️', '⏰', '💰', '🔥', '📌', '🎯'],
  },
  {
    name: 'Lifestyle',
    emojis: ['🎨', '🎵', '🌱', '🧹', '☕', '🎸', '🐶', '🐱', '🏠', '🎮', '📷', '✈️', '🚲', '🪴'],
  },
];

export default function EmojiSelector({ selectedEmoji = '🏃', onSelectEmoji, label = 'Habit Icon' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Popular');
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentCategoryData =
    EMOJI_CATEGORIES.find((c) => c.name === activeCategory) || EMOJI_CATEGORIES[0];

  return (
    <div className="relative" ref={popoverRef}>
      {label && (
        <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase mb-1">
          {label}
        </label>
      )}

      {/* Button to open Emoji Picker */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-11 px-4 py-2 rounded-xl bg-[#131316] border border-white/10 hover:border-[#d0bcff]/50 text-white flex items-center justify-between transition-all cursor-pointer shadow-inner"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{selectedEmoji || '🏃'}</span>
          <span className="text-xs font-geist text-[#cbc3d7]">Choose Icon</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#cbc3d7] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#d0bcff]' : ''
          }`}
        />
      </button>

      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 p-3 rounded-2xl bg-[#26252a] border border-[#d0bcff]/30 shadow-2xl space-y-3"
          >
            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-geist whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat.name
                      ? 'bg-[#a078ff] text-[#340080] font-extrabold shadow'
                      : 'bg-[#1a1a1d] text-[#cbc3d7] hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-1 bg-[#1a1a1d] rounded-xl border border-white/5">
              {currentCategoryData.emojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectEmoji(emoji);
                    setIsOpen(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-[#a078ff]/30 hover:scale-110 transition-all cursor-pointer ${
                    selectedEmoji === emoji
                      ? 'bg-[#a078ff]/40 ring-1 ring-[#d0bcff]'
                      : 'bg-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-geist text-[#cbc3d7] px-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#ffb95f]" /> Click emoji to select
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-white cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
