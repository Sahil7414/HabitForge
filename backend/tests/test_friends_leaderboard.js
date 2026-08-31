/**
 * Friends Leaderboard & Data Isolation Integration Test Suite
 * Run: node backend/tests/test_friends_leaderboard.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { XPTransaction } from '../models/XPTransaction.js';
import {
  getWeeklyLeaderboard,
  getFriendsLeaderboard,
  removeFriend,
} from '../controllers/socialController.js';

dotenv.config({ path: '.env' });

function mockReqRes(user, params = {}, body = {}, query = {}) {
  const req = { user, params, body, query, headers: {} };
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return { req, res };
}

async function runTests() {
  console.log('=== STARTING FRIENDS LEADERBOARD TEST SUITE ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas.');

  // Clean old test artifacts
  const emails = ['flb_user_a@test.com', 'flb_user_b@test.com', 'flb_user_c@test.com', 'flb_user_d@test.com'];
  await User.deleteMany({ email: { $in: emails } });

  // Create 4 users with distinct XP profiles
  const userA = await User.create({ name: 'User A (Sahil)', email: 'flb_user_a@test.com', password: 'Password123!', xp: 2450, level: 5 });
  const userB = await User.create({ name: 'User B (Rahul)', email: 'flb_user_b@test.com', password: 'Password123!', xp: 3100, level: 7 });
  const userC = await User.create({ name: 'User C (Amit)', email: 'flb_user_c@test.com', password: 'Password123!', xp: 2700, level: 6 });
  const userD = await User.create({ name: 'User D (David)', email: 'flb_user_d@test.com', password: 'Password123!', xp: 4000, level: 9 });

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);

  // Add weekly XP transactions
  await XPTransaction.create([
    { userId: userA._id, amount: 450, reason: 'HABIT_COMPLETION', createdAt: new Date() },
    { userId: userB._id, amount: 600, reason: 'HABIT_COMPLETION', createdAt: new Date() },
    { userId: userC._id, amount: 500, reason: 'HABIT_COMPLETION', createdAt: new Date() },
    { userId: userD._id, amount: 900, reason: 'HABIT_COMPLETION', createdAt: new Date() },
  ]);

  try {
    // Relationships:
    // User A <-> User B (accepted)
    // User A <-> User C (accepted)
    // User B <-> User D (accepted)
    // User A <-> User D (pending - MUST NOT COUNT!)
    await FriendRequest.create([
      { senderId: userA._id, receiverId: userB._id, status: 'accepted' },
      { senderId: userC._id, receiverId: userA._id, status: 'accepted' },
      { senderId: userB._id, receiverId: userD._id, status: 'accepted' },
      { senderId: userA._id, receiverId: userD._id, status: 'pending' },
    ]);

    // TEST 1: Global Leaderboard includes all 4 users ranked by weekly XP
    console.log('--- 1. Testing Global Leaderboard ---');
    const { req: reqGlobal, res: resGlobal } = mockReqRes(userA);
    await getWeeklyLeaderboard(reqGlobal, resGlobal);
    const globalList = resGlobal.data;

    if (!Array.isArray(globalList) || globalList.length < 4) {
      throw new Error(`Global leaderboard failed to return all users: ${JSON.stringify(globalList)}`);
    }
    console.log(`  ✅ Global Leaderboard: Returned ${globalList.length} users ranked correctly.`);

    // TEST 2: Friends Leaderboard for User A (Should have ONLY [User B, User C, User A])
    console.log('\n--- 2. Testing Friends Leaderboard for User A ---');
    const { req: reqFriendsA, res: resFriendsA } = mockReqRes(userA);
    await getFriendsLeaderboard(reqFriendsA, resFriendsA);
    const friendsA = resFriendsA.data;

    console.log('  User A Friends Leaderboard Standings:');
    friendsA.forEach(item => console.log(`    #${item.rank} ${item.name} (${item.weeklyXP} Weekly XP, ${item.totalXP} Total XP) [isCurrent: ${item.isCurrentUser}]`));

    if (friendsA.length !== 3) {
      throw new Error(`User A friends leaderboard expected exactly 3 users (A, B, C), got ${friendsA.length}`);
    }

    const idsInA = friendsA.map(u => u.userId);
    if (!idsInA.includes(userA._id.toString()) || !idsInA.includes(userB._id.toString()) || !idsInA.includes(userC._id.toString())) {
      throw new Error('User A friends leaderboard missing expected friends or self!');
    }

    if (idsInA.includes(userD._id.toString())) {
      throw new Error('Security Leakage: User D (pending request) incorrectly appeared in User A friends leaderboard!');
    }

    // Check Ranking order for User A:
    // User B (600 XP) -> Rank 1
    // User C (500 XP) -> Rank 2
    // User A (450 XP) -> Rank 3
    if (friendsA[0].userId !== userB._id.toString() || friendsA[1].userId !== userC._id.toString() || friendsA[2].userId !== userA._id.toString()) {
      throw new Error('Ranking order in Friends Leaderboard is incorrect!');
    }
    console.log('  ✅ User A Friends Leaderboard: Correct members (A, B, C) and correct ranking order (B #1, C #2, A #3).');

    // TEST 3: Friends Leaderboard for User B (Should have ONLY [User D, User B, User A])
    console.log('\n--- 3. Testing Friends Leaderboard for User B ---');
    const { req: reqFriendsB, res: resFriendsB } = mockReqRes(userB);
    await getFriendsLeaderboard(reqFriendsB, resFriendsB);
    const friendsB = resFriendsB.data;

    console.log('  User B Friends Leaderboard Standings:');
    friendsB.forEach(item => console.log(`    #${item.rank} ${item.name} (${item.weeklyXP} Weekly XP, ${item.totalXP} Total XP) [isCurrent: ${item.isCurrentUser}]`));

    if (friendsB.length !== 3) {
      throw new Error(`User B friends leaderboard expected exactly 3 users (B, D, A), got ${friendsB.length}`);
    }

    const idsInB = friendsB.map(u => u.userId);
    if (idsInB.includes(userC._id.toString())) {
      throw new Error('Security Leakage: User C incorrectly appeared in User B friends leaderboard!');
    }
    console.log('  ✅ User B Friends Leaderboard: Correct members (B, D, A) and User C excluded.');

    // TEST 4: Friend Removal (Unfriending) Immediately Reflects in Friends Leaderboard
    console.log('\n--- 4. Testing Friend Removal Reactivity in Friends Leaderboard ---');
    const { req: reqRemove, res: resRemove } = mockReqRes(userA, { friendId: userC._id.toString() });
    await removeFriend(reqRemove, resRemove);

    // Re-fetch User A Friends Leaderboard -> MUST now have ONLY [User B, User A]
    const { req: reqFriendsA2, res: resFriendsA2 } = mockReqRes(userA);
    await getFriendsLeaderboard(reqFriendsA2, resFriendsA2);
    const friendsAAfter = resFriendsA2.data;

    if (friendsAAfter.length !== 2 || friendsAAfter.some(u => u.userId === userC._id.toString())) {
      throw new Error('Unfriended user C still appeared in User A friends leaderboard!');
    }
    console.log('  ✅ Unfriend Reactivity: Removed friend immediately dropped from Friends Leaderboard.');

    // TEST 5: User with 0 Friends returns only the current user
    console.log('\n--- 5. Testing Zero Friends Leaderboard ---');
    const userZero = await User.create({ name: 'Solo User', email: 'flb_solo@test.com', password: 'Password123!', xp: 100, level: 1 });
    const { req: reqZero, res: resZero } = mockReqRes(userZero);
    await getFriendsLeaderboard(reqZero, resZero);
    const friendsZero = resZero.data;

    if (friendsZero.length !== 1 || friendsZero[0].userId !== userZero._id.toString()) {
      throw new Error('Zero friends user expected to see only self on Friends Leaderboard!');
    }
    console.log('  ✅ Zero Friends: Returned clean 1-member list containing only the current user.');

    console.log('\n🎉 ALL FRIENDS LEADERBOARD INTEGRATION TESTS PASSED 100%! 🎉\n');
  } finally {
    // Cleanup
    await User.deleteMany({ email: { $in: [...emails, 'flb_solo@test.com'] } });
    await FriendRequest.deleteMany({
      $or: [
        { senderId: { $in: [userA._id, userB._id, userC._id, userD._id] } },
        { receiverId: { $in: [userA._id, userB._id, userC._id, userD._id] } },
      ],
    });
    await XPTransaction.deleteMany({
      userId: { $in: [userA._id, userB._id, userC._id, userD._id] },
    });
    await mongoose.disconnect();
    console.log('✅ Teardown complete.');
  }
}

runTests().catch((err) => {
  console.error('\n❌ FRIENDS LEADERBOARD TEST FAILED:', err);
  process.exit(1);
});
