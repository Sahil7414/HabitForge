import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider !== 'google';
      },
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatar: {
      type: String,
      default: null,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    badges: {
      type: [String],
      default: [],
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumSince: {
      type: Date,
      default: null,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },
    expiredNotified: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    premiumExpirationEmailSentAt: {
      type: Date,
      default: null,
    },
    lastPaymentId: {
      type: String,
      default: null,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    theme: {
      type: String,
      default: 'dark',
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      streakAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.isPremiumActive = function () {
  return !!(this.isPremium && this.premiumExpiresAt && new Date(this.premiumExpiresAt) > new Date());
};

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};


export const User = mongoose.models.User || mongoose.model('User', userSchema);
