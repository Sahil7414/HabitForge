import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5001/api';

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
  console.log('HABITFORGE — ADMIN AUTHENTICATION TEST SUITE');
  console.log('==================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB for assertions.\n');

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
    // TEST 1: Admin Account Creation / Verification in MongoDB
    // ------------------------------------------------------------------------
    let admin = await User.findOne({ email: 'sahiljadhav7414@gmail.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Sahil Jadhav',
        email: 'sahiljadhav7414@gmail.com',
        authProvider: 'google',
        role: 'admin',
        status: 'active',
      });
    } else {
      admin.role = 'admin';
      admin.status = 'active';
      await admin.save();
    }

    assert('TEST 1: Master Admin exists with role="admin" & status="active" in MongoDB',
      admin && admin.role === 'admin' && admin.status === 'active'
    );

    const adminToken = jwt.sign({ id: admin._id.toString(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // ------------------------------------------------------------------------
    // TEST 2: Normal User Registration & Role Immunity
    // ------------------------------------------------------------------------
    const testNormalEmail = `normal_${Date.now()}@example.com`;
    const regRes = await makeRequest('/auth/register', 'POST', {
      name: 'Normal User',
      email: testNormalEmail,
      password: 'password123',
      role: 'admin', // Attempt privilege escalation via req.body
      status: 'active',
    });

    assert('TEST 2A: Registration returns 201 with role="user"',
      regRes.status === 201 && regRes.data?.user?.role === 'user'
    );

    const normalUserInDB = await User.findOne({ email: testNormalEmail });
    assert('TEST 2B: Database record strictly enforces role="user" ignoring body injection',
      normalUserInDB && normalUserInDB.role === 'user'
    );

    const normalToken = regRes.data.token;

    // ------------------------------------------------------------------------
    // TEST 3: Normal User Calling Protected Admin API (Forbidden 403)
    // ------------------------------------------------------------------------
    const forbiddenRes = await makeRequest('/admin/overview', 'GET', null, normalToken);
    assert('TEST 3: Normal user calling /api/admin/overview receives 403 Forbidden',
      forbiddenRes.status === 403
    );

    // ------------------------------------------------------------------------
    // TEST 4: Admin User Calling Protected Admin API (Success 200)
    // ------------------------------------------------------------------------
    const adminOverviewRes = await makeRequest('/admin/overview', 'GET', null, adminToken);
    assert('TEST 4: Admin calling /api/admin/overview receives 200 OK with system metrics',
      adminOverviewRes.status === 200 && adminOverviewRes.data?.metrics?.totalUsers !== undefined
    );

    // ------------------------------------------------------------------------
    // TEST 5: Admin Listing Users Directory
    // ------------------------------------------------------------------------
    const adminUsersRes = await makeRequest('/admin/users', 'GET', null, adminToken);
    assert('TEST 5: Admin calling /api/admin/users receives user directory list',
      adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data?.users)
    );

    // ------------------------------------------------------------------------
    // TEST 6: Admin Blocking Normal User
    // ------------------------------------------------------------------------
    const blockRes = await makeRequest(`/admin/users/${normalUserInDB._id}/status`, 'PUT', { status: 'blocked' }, adminToken);
    assert('TEST 6A: Admin blocks normal user with 200 OK',
      blockRes.status === 200 && blockRes.data?.user?.status === 'blocked'
    );

    const blockedUserInDB = await User.findById(normalUserInDB._id);
    assert('TEST 6B: Normal user status is "blocked" in MongoDB',
      blockedUserInDB && blockedUserInDB.status === 'blocked'
    );

    // ------------------------------------------------------------------------
    // TEST 7: Blocked User Denied API Access on Normal Endpoints (403)
    // ------------------------------------------------------------------------
    const blockedApiRes = await makeRequest('/habits', 'GET', null, normalToken);
    assert('TEST 7: Blocked user receives 403 on protected habit endpoints',
      blockedApiRes.status === 403
    );

    // ------------------------------------------------------------------------
    // TEST 8: Blocked User Denied on Login Endpoint
    // ------------------------------------------------------------------------
    const blockedLoginRes = await makeRequest('/auth/login', 'POST', {
      email: testNormalEmail,
      password: 'password123',
    });
    assert('TEST 8: Blocked user cannot log in (403 Forbidden)',
      blockedLoginRes.status === 403
    );

    // ------------------------------------------------------------------------
    // TEST 9: Master Admin Safety — Cannot Block Master Admin
    // ------------------------------------------------------------------------
    const blockAdminAttempt = await makeRequest(`/admin/users/${admin._id}/status`, 'PUT', { status: 'blocked' }, adminToken);
    assert('TEST 9: Master Admin cannot be blocked or altered (403 Forbidden)',
      blockAdminAttempt.status === 403
    );

    // ------------------------------------------------------------------------
    // TEST 10: Unblock Normal User
    // ------------------------------------------------------------------------
    const unblockRes = await makeRequest(`/admin/users/${normalUserInDB._id}/status`, 'PUT', { status: 'active' }, adminToken);
    assert('TEST 10: Admin unblocks normal user with 200 OK',
      unblockRes.status === 200 && unblockRes.data?.user?.status === 'active'
    );

    // Cleanup test normal user
    await User.deleteOne({ _id: normalUserInDB._id });

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n==================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');
  }
}

runTests();
