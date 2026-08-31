/**
 * Comprehensive Database Persistence, User-Specific Data & Update Consistency Audit Test Suite
 * Run: node backend/tests/test_persistence_audit.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { Payment } from '../models/Payment.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { Notification } from '../models/Notification.js';
import { XPTransaction } from '../models/XPTransaction.js';
import { getHabits, createHabit, updateHabit, deleteHabit, checkInHabit } from '../controllers/habitController.js';
import { getHeatmap, get30DayCompletions } from '../controllers/analyticsController.js';
import { getUserProfile, updateUserProfile, getDashboardSummary } from '../controllers/userController.js';
import { sendFriendRequest, respondToFriendRequest } from '../controllers/socialController.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
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

async function runAudit() {
  console.log('=== HABITFORGE DATABASE PERSISTENCE & USER ISOLATION AUDIT ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas persistent cluster.');

  // Clean previous audit artifacts
  await User.deleteMany({ email: { $in: ['audit_user_a@test.com', 'audit_user_b@test.com'] } });

  // 1. CREATE TEST USERS
  const userA = await User.create({
    name: 'Audit User A',
    email: 'audit_user_a@test.com',
    password: 'Password123!',
    xp: 0,
    level: 1,
    isPremium: true,
    timezone: 'UTC',
  });

  const userB = await User.create({
    name: 'Audit User B',
    email: 'audit_user_b@test.com',
    password: 'Password123!',
    xp: 0,
    level: 1,
    isPremium: false,
    timezone: 'UTC',
  });

  console.log(`✅ Created User A (${userA._id}) and User B (${userB._id})`);

  try {
    // ----------------------------------------------------
    // TEST 1: HABIT CRUD & USER ISOLATION
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Habit CRUD & User Isolation ---');

    // User A creates a Fitness habit
    const { req: reqCreateA, res: resCreateA } = mockReqRes(userA, {}, {
      title: 'Morning Jog',
      category: 'Fitness',
      frequency: 'DAILY',
      icon: '🏃',
      color: '#ff5722',
    });
    await createHabit(reqCreateA, resCreateA);
    const habitA = resCreateA.data;
    if (resCreateA.statusCode !== 201 || !habitA._id) {
      throw new Error(`Failed to create Habit A: ${JSON.stringify(resCreateA.data)}`);
    }

    // Verify Habit A is in MongoDB
    const habitADoc = await Habit.findById(habitA._id);
    if (!habitADoc || habitADoc.title !== 'Morning Jog' || habitADoc.userId.toString() !== userA._id.toString()) {
      throw new Error('Habit A not correctly persisted in MongoDB with userA._id');
    }
    console.log('  ✅ Habit Creation: Persisted in MongoDB with correct userId.');

    // User B attempts to UPDATE Habit A -> MUST FAIL 403
    const { req: reqUpdateB, res: resUpdateB } = mockReqRes(userB, { id: habitA._id.toString() }, {
      title: 'Hacked Habit Title',
    });
    await updateHabit(reqUpdateB, resUpdateB);
    if (resUpdateB.statusCode !== 403) {
      throw new Error(`Security Failure: User B was able to update User A habit! Status: ${resUpdateB.statusCode}`);
    }
    console.log('  ✅ Update Isolation: User B blocked from modifying User A habit (403).');

    // User A updates Habit A title and category
    const { req: reqUpdateA, res: resUpdateA } = mockReqRes(userA, { id: habitA._id.toString() }, {
      title: 'Morning Sprint',
      category: 'Fitness',
    });
    await updateHabit(reqUpdateA, resUpdateA);
    const updatedDoc = await Habit.findById(habitA._id);
    if (updatedDoc.title !== 'Morning Sprint') {
      throw new Error('Habit update not reflected in MongoDB');
    }
    console.log('  ✅ Update Persistence: User A updated habit successfully in MongoDB.');

    // User B lists habits -> MUST NOT see Habit A
    const { req: reqGetB, res: resGetB } = mockReqRes(userB);
    await getHabits(reqGetB, resGetB);
    if (resGetB.data.some(h => h.id === habitA._id.toString())) {
      throw new Error('Leakage Failure: User B can see User A habits in habit list!');
    }
    console.log('  ✅ Read Isolation: User B cannot see User A habits.');

    // ----------------------------------------------------
    // TEST 2: COMPLETION & GAMIFICATION PERSISTENCE
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Habit Check-In & Gamification Persistence ---');
    const todayStr = getNormalizedToday('UTC');

    // User B attempts to COMPLETE Habit A -> MUST FAIL 403
    const { req: reqCheckInB, res: resCheckInB } = mockReqRes(userB, { id: habitA._id.toString() });
    await checkInHabit(reqCheckInB, resCheckInB);
    if (resCheckInB.statusCode !== 403) {
      throw new Error(`Security Failure: User B was able to complete User A habit! Status: ${resCheckInB.statusCode}`);
    }
    console.log('  ✅ Completion Isolation: User B blocked from completing User A habit (403).');

    // User A completes Habit A
    const { req: reqCheckInA, res: resCheckInA } = mockReqRes(userA, { id: habitA._id.toString() });
    await checkInHabit(reqCheckInA, resCheckInA);
    if (resCheckInA.statusCode !== 200) {
      throw new Error(`Habit completion failed: ${JSON.stringify(resCheckInA.data)}`);
    }

    // Verify HabitLog in MongoDB
    const logDoc = await HabitLog.findOne({ habitId: habitA._id, userId: userA._id, completionDate: todayStr });
    if (!logDoc) {
      throw new Error('HabitLog document was not created in MongoDB!');
    }
    console.log('  ✅ HabitLog Persistence: MongoDB log created with correct habitId, userId, date.');

    // Verify Gamification (XP, Level, XPTransaction) in MongoDB
    const userADoc = await User.findById(userA._id);
    const xpTx = await XPTransaction.findOne({ userId: userA._id, sourceId: habitA._id.toString() });
    if (userADoc.xp < 10 || !xpTx) {
      throw new Error('XP / Gamification not persisted in MongoDB!');
    }
    console.log(`  ✅ Gamification Persistence: User A XP updated to ${userADoc.xp} and XPTransaction recorded.`);

    // Duplicate Check-in Protection: User A completes same habit again today -> MUST FAIL 400
    const { req: reqCheckInDup, res: resCheckInDup } = mockReqRes(userA, { id: habitA._id.toString() });
    await checkInHabit(reqCheckInDup, resCheckInDup);
    if (resCheckInDup.statusCode !== 400) {
      throw new Error(`Duplicate Check-in allowed! Status: ${resCheckInDup.statusCode}`);
    }
    console.log('  ✅ Duplicate Protection: Second daily check-in cleanly rejected (400).');

    // ----------------------------------------------------
    // TEST 3: ANALYTICS & HEATMAP CATEGORY FILTERING
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Analytics & Category-Isolated Heatmap ---');

    // User A requests heatmap for "Fitness" -> MUST show 1 completion
    const { req: reqHeatmapFit, res: resHeatmapFit } = mockReqRes(userA, {}, {}, { days: 30, category: 'Fitness' });
    await getHeatmap(reqHeatmapFit, resHeatmapFit);
    if (resHeatmapFit.data.totalCompletions !== 1) {
      throw new Error(`Expected 1 Fitness completion for User A, got ${resHeatmapFit.data.totalCompletions}`);
    }
    console.log('  ✅ Category Heatmap: Fitness category returns exactly 1 completion.');

    // User A requests heatmap for "Learning" (no habits) -> MUST show 0 completions
    const { req: reqHeatmapLearn, res: resHeatmapLearn } = mockReqRes(userA, {}, {}, { days: 30, category: 'Learning' });
    await getHeatmap(reqHeatmapLearn, resHeatmapLearn);
    if (resHeatmapLearn.data.totalCompletions !== 0) {
      throw new Error(`Expected 0 Learning completions for User A, got ${resHeatmapLearn.data.totalCompletions}`);
    }
    console.log('  ✅ Empty Category Heatmap: Learning category returns clean 0 completions.');

    // User B requests heatmap -> MUST show 0 completions (no leakage from User A)
    const { req: reqHeatmapB, res: resHeatmapB } = mockReqRes(userB, {}, {}, { days: 30 });
    await getHeatmap(reqHeatmapB, resHeatmapB);
    if (resHeatmapB.data.totalCompletions !== 0) {
      throw new Error(`Security Leakage: User B sees completions from User A! Count: ${resHeatmapB.data.totalCompletions}`);
    }
    console.log('  ✅ User Isolation in Analytics: User B sees 0 completions.');

    // ----------------------------------------------------
    // TEST 4: SOCIAL, FRIEND REQUESTS & NOTIFICATIONS
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Social, Friend Requests & Notifications ---');

    // User A sends friend request to User B
    const { req: reqSendFreq, res: resSendFreq } = mockReqRes(userA, { receiverId: userB._id.toString() });
    await sendFriendRequest(reqSendFreq, resSendFreq);
    if (resSendFreq.statusCode !== 201 && resSendFreq.statusCode !== 200) {
      throw new Error(`Failed to send friend request: ${JSON.stringify(resSendFreq.data)}`);
    }

    // Verify FriendRequest in MongoDB
    const freqDoc = await FriendRequest.findOne({ senderId: userA._id, receiverId: userB._id });
    if (!freqDoc || freqDoc.status !== 'pending') {
      throw new Error('FriendRequest not persisted in MongoDB with pending status!');
    }
    console.log('  ✅ FriendRequest Persistence: Created with status pending in MongoDB.');

    // Verify Notification created for User B
    const notifB = await Notification.findOne({ userId: userB._id, type: 'friend_request' });
    if (!notifB) {
      throw new Error('Notification for User B not created in MongoDB!');
    }
    console.log('  ✅ Notification Persistence: Friend request notification persisted for User B.');

    // User A checks notifications -> MUST NOT see User B's notification
    const { req: reqNotifA, res: resNotifA } = mockReqRes(userA);
    await getNotifications(reqNotifA, resNotifA);
    if (resNotifA.data.notifications.some(n => n.userId.toString() !== userA._id.toString())) {
      throw new Error('Notification Leakage: User A can see notifications belonging to other users!');
    }
    console.log('  ✅ Notification Isolation: User A sees only their own notifications.');

    // User B marks notification as read
    const { req: reqReadB, res: resReadB } = mockReqRes(userB, { id: notifB._id.toString() });
    await markAsRead(reqReadB, resReadB);
    const updatedNotifB = await Notification.findById(notifB._id);
    if (!updatedNotifB.read) {
      throw new Error('Notification read status not updated in MongoDB!');
    }
    console.log('  ✅ Notification Update: Marked as read and persisted in MongoDB.');

    // ----------------------------------------------------
    // TEST 5: PAYMENT PERSISTENCE & RECEIPT AUTHORIZATION
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Payment Persistence & Receipt Security ---');

    // Create payment record for User A
    const paymentA = await Payment.create({
      userId: userA._id,
      razorpayOrderId: 'order_audit_test_123',
      razorpayPaymentId: 'pay_audit_test_123',
      receiptNumber: 'HF-AUDIT-001',
      amount: 99,
      currency: 'INR',
      status: 'paid',
      plan: '30_days_premium',
    });

    // User B requests User A payment receipt -> MUST FAIL 403
    const { req: reqReceiptB, res: resReceiptB } = mockReqRes(userB, { paymentId: paymentA._id.toString() });
    await getReceipt(reqReceiptB, resReceiptB);
    if (resReceiptB.statusCode !== 403) {
      throw new Error(`Security Failure: User B accessed User A payment receipt! Status: ${resReceiptB.statusCode}`);
    }
    console.log('  ✅ Receipt Authorization: User B blocked from accessing User A receipt (403).');

    // User A requests User A receipt -> MUST SUCCEED with PDF content
    const { req: reqReceiptA, res: resReceiptA } = mockReqRes(userA, { paymentId: paymentA._id.toString() });
    await getReceipt(reqReceiptA, resReceiptA);
    if (resReceiptA.headers['Content-Type'] !== 'application/pdf') {
      throw new Error('User A receipt download failed or invalid content type');
    }
    console.log('  ✅ Receipt Retrieval: User A successfully accessed own PDF receipt.');

    // User B fetches billing history -> MUST NOT see User A payment
    const { req: reqBillB, res: resBillB } = mockReqRes(userB);
    await getBillingHistory(reqBillB, resBillB);
    const billListB = Array.isArray(resBillB.data) ? resBillB.data : (resBillB.data?.payments || []);
    if (billListB.some(p => p.userId.toString() !== userB._id.toString())) {
      throw new Error('Billing Leakage: User B sees payments belonging to User A!');
    }
    console.log('  ✅ Billing History Isolation: User B sees 0 payments.');

    // ----------------------------------------------------
    // TEST 6: USER PROFILE & SETTINGS PERSISTENCE
    // ----------------------------------------------------
    console.log('\n--- 6. Testing User Profile & Settings Persistence ---');

    const { req: reqProfUpdate, res: resProfUpdate } = mockReqRes(userA, {}, {
      name: 'Sahil Audit Pro',
      timezone: 'Asia/Kolkata',
      theme: 'neon',
      notificationPreferences: { emailNotifications: false, streakAlerts: true },
    });
    await updateUserProfile(reqProfUpdate, resProfUpdate);

    const reloadedUserA = await User.findById(userA._id);
    if (
      reloadedUserA.name !== 'Sahil Audit Pro' ||
      reloadedUserA.timezone !== 'Asia/Kolkata' ||
      reloadedUserA.theme !== 'neon' ||
      reloadedUserA.notificationPreferences.emailNotifications !== false
    ) {
      throw new Error('User profile / settings updates not persisted in MongoDB!');
    }
    console.log('  ✅ Settings Persistence: Name, Timezone, Theme, Notification Preferences saved to MongoDB.');

    // ----------------------------------------------------
    // TEST 7: HABIT DELETION PERSISTENCE & CLEANUP
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Habit Deletion Persistence ---');

    // User B attempts to DELETE Habit A -> MUST FAIL 403
    const { req: reqDelB, res: resDelB } = mockReqRes(userB, { id: habitA._id.toString() });
    await deleteHabit(reqDelB, resDelB);
    if (resDelB.statusCode !== 403) {
      throw new Error(`Security Failure: User B deleted User A habit! Status: ${resDelB.statusCode}`);
    }
    console.log('  ✅ Delete Isolation: User B blocked from deleting User A habit (403).');

    // User A deletes Habit A
    const { req: reqDelA, res: resDelA } = mockReqRes(userA, { id: habitA._id.toString() });
    await deleteHabit(reqDelA, resDelA);

    // Verify Habit and its HabitLogs are deleted from MongoDB
    const deletedHabit = await Habit.findById(habitA._id);
    const deletedLogs = await HabitLog.find({ habitId: habitA._id });
    if (deletedHabit !== null || deletedLogs.length > 0) {
      throw new Error('Deleted habit or associated logs still exist in MongoDB!');
    }
    console.log('  ✅ Delete Persistence: Habit and all completion history cleanly removed from MongoDB.');

    console.log('\n🎉 ALL 7 AUDIT CATEGORIES PASSED 100% CLEANLY WITH MONGODB AS SOURCE OF TRUTH! 🎉\n');
  } finally {
    // Cleanup test audit data
    await User.deleteMany({ email: { $in: ['audit_user_a@test.com', 'audit_user_b@test.com'] } });
    await Payment.deleteMany({ razorpayOrderId: 'order_audit_test_123' });
    await mongoose.disconnect();
    console.log('✅ Audit database teardown complete.');
  }
}

runAudit().catch((err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});
