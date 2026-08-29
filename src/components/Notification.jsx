import { motion, AnimatePresence } from 'framer-motion';

export default function Notification({ data }) {
  const getContent = () => {
    if (!data) return null;

    if (data.title) {
      return {
        icon: data.icon || (data.type === 'deleted' || data.type === 'friend_removed' ? '🗑️' : data.type === 'friend_accepted' ? '🎉' : data.type === 'friend_request' ? '🤝' : '⭐'),
        title: data.title,
        sub: data.sub || data.message || 'Updated successfully.',
        color: data.type === 'deleted' || data.type === 'friend_removed' ? 'var(--color-error)' : data.type === 'friend_accepted' ? 'var(--color-success)' : 'var(--color-primary)',
        bg: 'rgba(208,188,255,0.1)',
        border: 'rgba(208,188,255,0.3)',
      };
    }

    switch (data?.type) {
      case 'xp':
        return {
          icon: '⭐',
          title: `+${data.amount || 10} XP Earned!`,
          sub: 'Keep building those habits.',
          color: 'var(--color-primary)',
          bg: 'rgba(208,188,255,0.1)',
          border: 'rgba(208,188,255,0.3)',
        };
      case 'levelup':
        return {
          icon: '🚀',
          title: `LEVEL UP! → Level ${data.level}`,
          sub: 'You\'re getting stronger every day!',
          color: '#FFD700',
          bg: 'rgba(255,215,0,0.1)',
          border: 'rgba(255,215,0,0.3)',
        };
      case 'habit_added':
        return {
          icon: '✅',
          title: 'New Habit Created!',
          sub: data.title || 'Habit added to your daily list.',
          color: 'var(--color-success)',
          bg: 'rgba(16,185,129,0.1)',
          border: 'rgba(16,185,129,0.3)',
        };
      case 'friend_removed':
      case 'deleted':
        return {
          icon: '🗑️',
          title: data.title || 'Item Removed',
          sub: data.sub || 'Your changes have been saved.',
          color: 'var(--color-error)',
          bg: 'rgba(255,180,171,0.1)',
          border: 'rgba(255,180,171,0.3)',
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <motion.div
      key="notification"
      initial={{ opacity: 0, y: -60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed top-6 right-6 z-[9999] flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl"
      style={{
        background: 'var(--color-surface-card, #1f1f22)',
        border: `1px solid ${content.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${content.border}`,
        minWidth: 280,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="text-2xl">{content.icon}</span>
      <div>
        <p className="font-semibold text-sm" style={{ fontFamily: 'var(--font-geist)', color: content.color }}>
          {content.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted, #cbc3d7)', fontFamily: 'var(--font-inter)' }}>
          {content.sub}
        </p>
      </div>
    </motion.div>
  );
}
