import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';

dotenv.config({ path: '.env' });

async function resetUserSubscription() {
  const email = 'sahiljadhav7414@gmail.com';
  console.log(`=== RESETTING SUBSCRIPTION & BILLING HISTORY FOR ${email} ===\n`);

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in backend/.env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.');

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found in MongoDB.`);
      process.exit(1);
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Reset User Subscription Fields
    user.isPremium = true;
    user.isCancelled = false;
    user.cancelledAt = null;
    user.premiumSince = now;
    user.premiumExpiresAt = thirtyDaysFromNow;
    user.expiredNotified = false;

    await user.save();
    console.log(`✅ User ${email} subscription reset:`);
    console.log(`   - isPremium: true`);
    console.log(`   - isCancelled: false`);
    console.log(`   - premiumSince: ${now.toISOString()}`);
    console.log(`   - premiumExpiresAt: ${thirtyDaysFromNow.toISOString()} (30 days left)`);

    // 2. Clear / Reset Payment History for this User
    const deletedCount = await Payment.deleteMany({ userId: user._id });
    console.log(`✅ Cleared ${deletedCount.deletedCount} old payment history records for ${email}.`);

    // 3. Create 1 Clean Fresh Active Payment Record
    const newPayment = await Payment.create({
      userId: user._id,
      razorpayOrderId: `order_reset_${Date.now()}`,
      razorpayPaymentId: `pay_reset_${Date.now().toString().slice(-8)}`,
      receiptNumber: `HF-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: 99,
      currency: 'INR',
      status: 'paid',
      plan: '30_days_premium',
      paymentMethod: 'UPI / Razorpay',
      premiumStartedAt: now,
      premiumExpiresAt: thirtyDaysFromNow,
    });

    console.log(`✅ Created 1 clean active payment record: ${newPayment.receiptNumber} (${newPayment.razorpayPaymentId})`);

    console.log('\n🎉 SUBSCRIPTION & BILLING HISTORY RESET SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('❌ Reset script error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetUserSubscription();
