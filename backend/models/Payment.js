import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'online',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    plan: {
      type: String,
      default: '30_days_premium',
    },
    premiumStartedAt: {
      type: Date,
      default: null,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },
    receiptGeneratedAt: {
      type: Date,
      default: null,
    },
    receiptEmailSentAt: {
      type: Date,
      default: null,
    },
    receiptEmailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    receiptEmailMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
