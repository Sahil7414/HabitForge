import mongoose from 'mongoose';

const habitLogSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: String, // Normalized 'YYYY-MM-DD'
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly prevent duplicate daily check-ins
habitLogSchema.index({ habitId: 1, completionDate: 1 }, { unique: true });

export const HabitLog = mongoose.models.HabitLog || mongoose.model('HabitLog', habitLogSchema);
