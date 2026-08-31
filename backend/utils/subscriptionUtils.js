import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { sendPremiumExpirationEmail } from '../services/emailService.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

export function calculateNewExpiryDate() {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = new Date();
  return new Date(now.getTime() + THIRTY_DAYS_MS);
}

export async function checkAndUpdateUserPremiumStatus(user) {
  if (!user) return { isPremium: false, premiumExpiresAt: null };

  const now = new Date();
  const expiresAt = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;

  // If user is marked premium but subscription has expired
  if (user.isPremium && expiresAt && expiresAt <= now) {
    const isMongo = isMongoConnected() && typeof user.save === 'function';

    user.isPremium = false;

    if (!user.expiredNotified) {
      user.expiredNotified = true;

      const notifMessage = 'Your HabitForge Premium subscription has expired. Re-subscribe anytime to unlock 365-day heatmaps and unlimited habits!';

      if (isMongo) {
        try {
          await Notification.create({
            userId: user._id,
            type: 'system',
            title: 'HabitForge Premium Expired ⏳',
            message: notifMessage,
          });
        } catch (err) {
          console.error('[Subscription Check] Notification creation error:', err.message);
        }
      } else {
        inMemoryDB.notifications.unshift({
          _id: `notif_${Date.now()}`,
          id: `notif_${Date.now()}`,
          userId: (user._id || user.id).toString(),
          type: 'system',
          title: 'HabitForge Premium Expired ⏳',
          message: notifMessage,
          read: false,
          createdAt: now,
        });
      }

      // Trigger expiration email asynchronously
      sendPremiumExpirationEmail({ user, expirationDate: expiresAt }).catch((err) => {
        console.error('[Subscription Check] Expiration email failed:', err.message);
      });
    }

    if (isMongo) {
      await user.save();
    }

    return { isPremium: false, premiumExpiresAt: expiresAt };
  }

  // Active check
  const isActive = !!(user.isPremium && (!expiresAt || expiresAt > now));
  return { isPremium: isActive, premiumExpiresAt: expiresAt };
}

export async function runGlobalSubscriptionCheck() {
  if (!isMongoConnected()) return;

  try {
    const now = new Date();
    const expiredUsers = await User.find({
      isPremium: true,
      premiumExpiresAt: { $lte: now },
    });

    for (const user of expiredUsers) {
      await checkAndUpdateUserPremiumStatus(user);
    }
  } catch (err) {
    console.error('[Global Subscription Check] Error:', err.message);
  }
}
