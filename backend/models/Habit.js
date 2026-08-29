import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Habit title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal', 'Other'],
      default: 'Health',
    },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY'],
      default: 'DAILY',
    },
    icon: {
      type: String,
      default: '🏃',
    },
    color: {
      type: String,
      default: '#a078ff',
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedDate: {
      type: String,
      default: null,
    },
    totalCompletions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

habitSchema.index({ userId: 1, isArchived: 1, isPaused: 1 });

export const Habit = mongoose.models.Habit || mongoose.model('Habit', habitSchema);
