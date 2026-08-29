import mongoose from 'mongoose';

const xpTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['HABIT_COMPLETION', 'STREAK_BONUS_7', 'STREAK_BONUS_30', 'BADGE_UNLOCK', 'MILESTONE_BONUS'],
    },
    sourceId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

xpTransactionSchema.index({ userId: 1, createdAt: -1 });

export const XPTransaction =
  mongoose.models.XPTransaction || mongoose.model('XPTransaction', xpTransactionSchema);
