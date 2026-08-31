import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5001/api';
const MASTER_ADMIN_EMAIL = 'sahiljadhav7414@gmail.com';

async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n==================================================');
  console.log('HABITFORGE — USER BLOCKING / UNBLOCKING AUDIT');
  console.log('==================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  const { User } = await import('../models/User.js');
  const { Habit } = await import('../models/Habit.js');
  const { HabitLog } = await import('../models/HabitLog.js');
  const { FriendRequest } = await import('../models/FriendRequest.js');
  const { XPTransaction } = await import('../models/XPTransaction.js');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${extraInfo}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SETUP: Seed Admin and Test Users
    // ------------------------------------------------------------------------
    let admin = await User.findOne({ email: MASTER_ADMIN_EMAIL });
    if (!admin) {
      admin = await User.create({
        name: 'Master Admin',
        email: MASTER_ADMIN_EMAIL,
        password: 'adminpassword123',
        role: 'admin',
        status: 'active',
      });
    } else {
      admin.role = 'admin';
      admin.status = 'active';
      await admin.save();
    }
    const adminToken = jwt.sign(
      { id: admin._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const emailA = 'test_block_target_a@habitforge.com';
    let userA = await User.findOne({ email: emailA });
    if (!userA) {
      userA = await User.create({
        name: 'Target User A',
        email: emailA,
        password: 'password123',
        role: 'user',
        status: 'active',
        xp: 350,
        level: 3,
        badges: ['starter_1'],
        isPremium: true,
      });
    } else {
      userA.status = 'active';
      userA.xp = 350;
      userA.level = 3;
      userA.isPremium = true;
      userA.password = 'password123';
      await userA.save();
    }
    const userAToken = jwt.sign(
      { id: userA._id.toString(), role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const emailB = 'test_friend_user_b@habitforge.com';
    let userB = await User.findOne({ email: emailB });
    if (!userB) {
      userB = await User.create({
        name: 'Friend User B',
        email: emailB,
        password: 'password123',
        role: 'user',
        status: 'active',
        xp: 200,
        level: 2,
      });
    } else {
      userB.status = 'active';
      await userB.save();
    }
    const userBToken = jwt.sign(
      { id: userB._id.toString(), role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Seed habit for userA
    await Habit.deleteMany({ userId: userA._id });
    await Habit.create({
      userId: userA._id,
      title: 'Target A Daily Meditation',
      category: 'Mindfulness',
      frequency: 'DAILY',
      currentStreak: 7,
      longestStreak: 14,
      totalCompletions: 21,
    });

    // Seed Friendship between A and B
    await FriendRequest.deleteMany({
      $or: [
        { senderId: userA._id, receiverId: userB._id },
        { senderId: userB._id, receiverId: userA._id },
      ],
    });

    await FriendRequest.create({
      senderId: userA._id,
      receiverId: userB._id,
      status: 'accepted',
    });

    console.log('✓ Test environment seeded successfully.\n');

    // ------------------------------------------------------------------------
    // TEST 1: Admin Blocks User A
    // ------------------------------------------------------------------------
    const blockRes = await makeRequest(
      `/admin/users/${userA._id}/status`,
      'PUT',
      { status: 'blocked' },
      adminToken
    );
    assert('Admin can block user', blockRes.status === 200 && blockRes.data?.user?.status === 'blocked', JSON.stringify(blockRes));

    const dbUserA = await User.findById(userA._id);
    assert('User A status in MongoDB is "blocked"', dbUserA.status === 'blocked');
    assert('User A data is NOT deleted on block (XP preserved)', dbUserA.xp === 350);
    assert('User A habits are NOT deleted on block', (await Habit.countDocuments({ userId: userA._id })) === 1);

    // ------------------------------------------------------------------------
    // TEST 2: Blocked User A Login Attempt
    // ------------------------------------------------------------------------
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: emailA,
      password: 'password123',
    });
    assert(
      'Blocked user login rejected with 403 Forbidden',
      loginRes.status === 403,
      `Got status ${loginRes.status}`
    );
    assert(
      'Blocked login returns exact required message',
      loginRes.data?.message === 'Your account has been blocked by an administrator.',
      `Got message: ${loginRes.data?.message}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Blocked User A Active Token Access to Protected APIs
    // ------------------------------------------------------------------------
    const apiAccessRes = await makeRequest('/users/dashboard-summary', 'GET', null, userAToken);
    assert(
      'Protected middleware rejects blocked user token with 403',
      apiAccessRes.status === 403,
      `Got status ${apiAccessRes.status}`
    );
    assert(
      'Protected middleware returns exact required message',
      apiAccessRes.data?.message === 'Your account has been blocked by an administrator.',
      `Got message: ${apiAccessRes.data?.message}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Global Leaderboard Excludes Blocked User
    // ------------------------------------------------------------------------
    const globalLbRes = await makeRequest('/social/leaderboard', 'GET', null, userBToken);
    assert('Global leaderboard loads', globalLbRes.status === 200);
    const inGlobal = (globalLbRes.data || []).some((u) => u.userId === userA._id.toString());
    assert('Blocked user is excluded from Global Leaderboard', !inGlobal, `Found in global: ${inGlobal}`);

    // ------------------------------------------------------------------------
    // TEST 5: Friends Leaderboard Excludes Blocked User
    // ------------------------------------------------------------------------
    const friendsLbRes = await makeRequest('/social/leaderboard/friends', 'GET', null, userBToken);
    assert('Friends leaderboard loads', friendsLbRes.status === 200);
    const inFriends = (friendsLbRes.data || []).some((u) => u.userId === userA._id.toString());
    assert('Blocked user is excluded from Friends Leaderboard', !inFriends, `Found in friends: ${inFriends}`);

    // ------------------------------------------------------------------------
    // TEST 6: Friend Suggestions Exclude Blocked User
    // ------------------------------------------------------------------------
    const suggestionsRes = await makeRequest('/social/friends/suggested', 'GET', null, adminToken);
    assert('Friend suggestions load', suggestionsRes.status === 200);
    const inSuggestions = (suggestionsRes.data || []).some((u) => (u._id || u.id).toString() === userA._id.toString());
    assert('Blocked user is excluded from Friend Suggestions', !inSuggestions);

    // ------------------------------------------------------------------------
    // TEST 7: Social Search Shows Safe Placeholder for Blocked User
    // ------------------------------------------------------------------------
    const searchRes = await makeRequest(`/social/users/search?q=Target+User+A`, 'GET', null, userBToken);
    assert('Search query succeeds', searchRes.status === 200);
    const searchMatch = (searchRes.data || []).find((u) => (u._id || u.id).toString() === userA._id.toString());
    assert('Blocked user found with username and blocked flag in search', searchMatch && searchMatch.isBlocked === true && searchMatch.name === 'Target User A');
    assert('Blocked user private details (XP/email) not leaked in search', searchMatch?.xp === 0 && searchMatch?.email === '');

    // ------------------------------------------------------------------------
    // TEST 8: Existing Friends List Shows Safe Placeholder for Blocked User
    // ------------------------------------------------------------------------
    const friendsListRes = await makeRequest('/social/friends', 'GET', null, userBToken);
    assert('Friends list query succeeds', friendsListRes.status === 200);
    const friendEntry = (friendsListRes.data || []).find((f) => (f.id || f._id).toString() === userA._id.toString());
    assert('Friend relationship preserved in DB', !!friendEntry);
    assert('Blocked friend displayed with username and blocked flag', friendEntry?.isBlocked === true && friendEntry?.name === 'Target User A');
    assert('Blocked friend XP/level concealed', friendEntry?.xp === 0 && friendEntry?.level === 0);

    // ------------------------------------------------------------------------
    // TEST 9: Cannot Send Friend Request to Blocked User
    // ------------------------------------------------------------------------
    const sendReqRes = await makeRequest(`/social/friends/request/${userA._id}`, 'POST', null, adminToken);
    assert(
      'Cannot send friend request to blocked user',
      sendReqRes.status === 400 && sendReqRes.data?.message === 'Cannot send friend request to this account',
      JSON.stringify(sendReqRes)
    );

    // ------------------------------------------------------------------------
    // TEST 10: Admin Overview KPI Counts
    // ------------------------------------------------------------------------
    const overviewRes = await makeRequest('/admin/overview', 'GET', null, adminToken);
    assert('Admin overview metrics load', overviewRes.status === 200 && !!overviewRes.data?.metrics);
    assert('Blocked users counted accurately in overview', overviewRes.data?.metrics?.blockedUsers >= 1);

    // ------------------------------------------------------------------------
    // TEST 11: Admin Inspects Blocked User Full Stored Details
    // ------------------------------------------------------------------------
    const userDetailsRes = await makeRequest(`/admin/users/${userA._id}`, 'GET', null, adminToken);
    assert('Admin can view blocked user full details', userDetailsRes.status === 200 && !!userDetailsRes.data?.user);
    assert('Admin sees user status 🔴 BLOCKED', userDetailsRes.data?.user?.status === 'blocked');
    assert('Admin sees user intact stored XP (350)', userDetailsRes.data?.user?.xp === 350);
    assert('Admin sees user intact stored habits', userDetailsRes.data?.habits?.length === 1);
    assert('Admin sees habit title intact', userDetailsRes.data?.habits?.[0]?.title === 'Target A Daily Meditation');

    // ------------------------------------------------------------------------
    // TEST 12: Admin Unblocks User A
    // ------------------------------------------------------------------------
    const unblockRes = await makeRequest(
      `/admin/users/${userA._id}/status`,
      'PUT',
      { status: 'active' },
      adminToken
    );
    assert('Admin can unblock user', unblockRes.status === 200 && unblockRes.data?.user?.status === 'active');

    const restoredDbA = await User.findById(userA._id);
    assert('User A status in MongoDB is "active"', restoredDbA.status === 'active');
    assert('User A XP remained untouched throughout', restoredDbA.xp === 350);

    // ------------------------------------------------------------------------
    // TEST 13: Unblocked User A Can Log In & Access APIs
    // ------------------------------------------------------------------------
    const restoredLoginRes = await makeRequest('/auth/login', 'POST', {
      email: emailA,
      password: 'password123',
    });
    assert('Unblocked user can log in again', restoredLoginRes.status === 200 && !!restoredLoginRes.data?.token);

    const restoredApiRes = await makeRequest('/users/dashboard-summary', 'GET', null, restoredLoginRes.data.token);
    assert('Unblocked user can access protected APIs again', restoredApiRes.status === 200 && !!restoredApiRes.data?.stats);

    // ------------------------------------------------------------------------
    // TEST 14: Unblocked User Reappears in Leaderboards & Social
    // ------------------------------------------------------------------------
    const postUnblockLbRes = await makeRequest('/social/leaderboard', 'GET', null, userBToken);
    const reappearedGlobal = (postUnblockLbRes.data || []).some((u) => u.userId === userA._id.toString());
    assert('Unblocked user reappears in Global Leaderboard', reappearedGlobal);

    const postUnblockFriendsRes = await makeRequest('/social/friends', 'GET', null, userBToken);
    const restoredFriendEntry = (postUnblockFriendsRes.data || []).find((f) => (f.id || f._id).toString() === userA._id.toString());
    assert('Friend sees normal user profile restored', restoredFriendEntry && !restoredFriendEntry.isBlocked && restoredFriendEntry.name === 'Target User A');

    // ------------------------------------------------------------------------
    // TEST 15: Security: Master Admin Cannot Be Blocked
    // ------------------------------------------------------------------------
    const blockAdminRes = await makeRequest(
      `/admin/users/${admin._id}/status`,
      'PUT',
      { status: 'blocked' },
      adminToken
    );
    assert(
      'Master Administrator cannot be blocked (403 Forbidden)',
      blockAdminRes.status === 403 && blockAdminRes.data?.message === 'Cannot modify status of the Master Administrator'
    );

    // ------------------------------------------------------------------------
    // TEST 16: Security: Non-Admin Cannot Call Admin Endpoints
    // ------------------------------------------------------------------------
    const nonAdminBlockRes = await makeRequest(
      `/admin/users/${userA._id}/status`,
      'PUT',
      { status: 'blocked' },
      userBToken
    );
    assert('Non-admin request rejected with 403 Forbidden', nonAdminBlockRes.status === 403);
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
