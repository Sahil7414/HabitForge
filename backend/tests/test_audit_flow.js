import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { Payment } from '../models/Payment.js';
import { getHeatmap } from '../controllers/analyticsController.js';
import { resendReceipt, getReceipt, getBillingHistory } from '../controllers/paymentController.js';
import { getNormalizedToday } from '../utils/dateUtils.js';

dotenv.config({ path: '.env' });

function mockReqRes(user, params = {}, body = {}, query = {}) {
  const req = { user, params, body, query, headers: {} };
  const res = {
    statusCode: 200,
    data: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    json(data) {
      this.data = data;
      return this;
    },
    send(data) {
      this.data = data;
      return this;
    },
  };
  return { req, res };
}

async function runAuditTests() {
  console.log('=== STARTING HABITFORGE CATEGORY HEATMAP & PAYMENT EMAIL AUDIT ===\n');

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB Atlas successfully.');
    } else {
      console.log('⚠️ MONGODB_URI not set.');
    }

    // Cleanup past test data
    await User.deleteMany({ email: { $regex: /^test_audit_.*@example\.com$/ } });

    const userA = await User.create({
      name: 'Audit User A',
      email: 'test_audit_a@example.com',
      password: 'password123',
      timezone: 'Asia/Kolkata',
    });

    const userB = await User.create({
      name: 'Audit User B',
      email: 'test_audit_b@example.com',
      password: 'password123',
      timezone: 'America/New_York',
    });

    const todayStr = getNormalizedToday('Asia/Kolkata');
    const yesterdayStr = '2026-08-30';

    // 1. Create habits for User A
    const habitA1 = await Habit.create({
      userId: userA._id,
      title: 'Running',
      category: 'Fitness',
      frequency: 'DAILY',
    });
    const habitA2 = await Habit.create({
      userId: userA._id,
      title: 'Workout',
      category: 'Fitness',
      frequency: 'DAILY',
    });
    const habitA3 = await Habit.create({
      userId: userA._id,
      title: 'Reading',
      category: 'Learning',
      frequency: 'DAILY',
    });

    // Create logs for User A
    await HabitLog.create({ userId: userA._id, habitId: habitA1._id, completionDate: todayStr });
    await HabitLog.create({ userId: userA._id, habitId: habitA2._id, completionDate: todayStr });
    await HabitLog.create({ userId: userA._id, habitId: habitA3._id, completionDate: yesterdayStr });

    // Create habit and log for User B
    const habitB1 = await Habit.create({
      userId: userB._id,
      title: 'Meditation',
      category: 'Mindfulness',
      frequency: 'DAILY',
    });
    await HabitLog.create({ userId: userB._id, habitId: habitB1._id, completionDate: todayStr });

    console.log('Created Habits & Completion Logs for User A & User B');

    // TEST 1: Heatmap Category Filter "Fitness" for User A
    console.log('\n--- 1. Testing Category Filter "Fitness" ---');
    {
      const { req, res } = mockReqRes(userA, {}, {}, { days: '90', category: 'Fitness' });
      await getHeatmap(req, res);
      if (res.statusCode === 200 && res.data?.cells) {
        const todayCell = res.data.cells.find((c) => c.fullDate === todayStr);
        const yestCell = res.data.cells.find((c) => c.fullDate === yesterdayStr);
        if (todayCell?.count === 2 && (!yestCell || yestCell.count === 0)) {
          console.log(`✅ Test 1 Passed: Fitness heatmap contains exactly 2 completions on today (${todayStr}) and 0 on yesterday.`);
        } else {
          throw new Error(`Test 1 Failed: Expected today count 2, got ${todayCell?.count}`);
        }
      } else {
        throw new Error('Test 1 Failed: getHeatmap response invalid');
      }
    }

    // TEST 2: Heatmap Category Filter "Learning" for User A
    console.log('\n--- 2. Testing Category Filter "Learning" ---');
    {
      const { req, res } = mockReqRes(userA, {}, {}, { days: '90', category: 'Learning' });
      await getHeatmap(req, res);
      if (res.statusCode === 200 && res.data?.cells) {
        const todayCell = res.data.cells.find((c) => c.fullDate === todayStr);
        const yestCell = res.data.cells.find((c) => c.fullDate === yesterdayStr);
        if ((!todayCell || todayCell.count === 0) && yestCell?.count === 1) {
          console.log(`✅ Test 2 Passed: Learning heatmap contains 0 completions on today and 1 on yesterday (${yesterdayStr}).`);
        } else {
          throw new Error(`Test 2 Failed: Expected Learning yest count 1, got ${yestCell?.count}`);
        }
      } else {
        throw new Error('Test 2 Failed: getHeatmap Learning response invalid');
      }
    }

    // TEST 3: Empty Category Filter "Health" (0 habits) for User A
    console.log('\n--- 3. Testing Category Filter with 0 Habits ("Health") ---');
    {
      const { req, res } = mockReqRes(userA, {}, {}, { days: '90', category: 'Health' });
      await getHeatmap(req, res);
      if (res.statusCode === 200 && res.data?.cells && Array.isArray(res.data.cells)) {
        const totalCompletions = res.data.totalCompletions;
        const allZero = res.data.cells.every((c) => c.count === 0);
        if (totalCompletions === 0 && allZero && res.data.cells.length > 50) {
          console.log('✅ Test 3 Passed: Empty category renders full calendar structure with 0 completions.');
        } else {
          throw new Error(`Test 3 Failed: Empty category did not return zeroed cells (totalCompletions=${totalCompletions})`);
        }
      } else {
        throw new Error('Test 3 Failed: Empty category response invalid');
      }
    }

    // TEST 4: Payment Ownership Security & Resend Receipt
    console.log('\n--- 4. Testing Payment Receipt Resend & Security ---');
    const payment1 = await Payment.create({
      userId: userA._id,
      razorpayOrderId: 'order_audit_101',
      razorpayPaymentId: 'pay_audit_101',
      receiptNumber: 'HF-2026-100001',
      amount: 99,
      currency: 'INR',
      status: 'paid',
      plan: '30_days_premium',
    });

    const payment2 = await Payment.create({
      userId: userA._id,
      razorpayOrderId: 'order_audit_102',
      razorpayPaymentId: 'pay_audit_102',
      receiptNumber: 'HF-2026-100002',
      amount: 99,
      currency: 'INR',
      status: 'paid',
      plan: '30_days_premium',
    });

    // Resend Payment 1 to User A
    {
      const { req, res } = mockReqRes(userA, { paymentId: payment1._id.toString() });
      await resendReceipt(req, res);
      if (res.statusCode === 200 && res.data?.message?.includes('test_audit_a@example.com')) {
        console.log(`✅ Test 4a Passed: Payment 1 receipt email dispatched to ${userA.email}`);
      } else {
        throw new Error(`Test 4a Failed: ${JSON.stringify(res.data)}`);
      }
    }

    // Resend Payment 2 to User A
    {
      const { req, res } = mockReqRes(userA, { paymentId: payment2._id.toString() });
      await resendReceipt(req, res);
      if (res.statusCode === 200 && res.data?.message?.includes('test_audit_a@example.com')) {
        console.log(`✅ Test 4b Passed: Payment 2 receipt email dispatched to ${userA.email}`);
      } else {
        throw new Error(`Test 4b Failed: ${JSON.stringify(res.data)}`);
      }
    }

    // Security Check: User B attempts to resend User A's Payment 1 -> Expect 403
    {
      const { req, res } = mockReqRes(userB, { paymentId: payment1._id.toString() });
      await resendReceipt(req, res);
      if (res.statusCode === 403) {
        console.log('✅ Test 4c Passed: User B blocked from emailing User A payment receipt (403 Forbidden).');
      } else {
        throw new Error(`Test 4c Failed: Expected 403, got ${res.statusCode}`);
      }
    }

    // Clean up audit test data
    await User.deleteMany({ email: { $regex: /^test_audit_.*@example\.com$/ } });
    await Habit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await HabitLog.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await Payment.deleteMany({ userId: { $in: [userA._id, userB._id] } });

    console.log('\n🎉 ALL AUDIT INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ AUDIT INTEGRATION TESTS FAILED:', err.message, err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAuditTests();
