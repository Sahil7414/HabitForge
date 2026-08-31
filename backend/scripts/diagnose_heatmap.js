/**
 * Diagnostic script: Inspect actual DB data for sahiljadhav7414@gmail.com
 * Run: node backend/scripts/diagnose_heatmap.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';

dotenv.config({ path: '.env' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // 1. Find the real user
  const user = await User.findOne({ email: 'sahiljadhav7414@gmail.com' }).lean();
  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }
  const userId = user._id;
  console.log('=== USER ===');
  console.log('  _id:', userId.toString(), '(type:', typeof userId, ')');
  console.log('  name:', user.name);
  console.log('  isPremium:', user.isPremium);
  console.log();

  // 2. Inspect all habits
  const habits = await Habit.find({ userId }).lean();
  console.log(`=== HABITS (${habits.length} total) ===`);
  habits.forEach((h) => {
    console.log(`  [${h._id}] "${h.title}" | category: "${h.category}" | isActive: ${h.isActive} | isArchived: ${h.isArchived}`);
  });
  console.log();

  // 3. Inspect recent habit logs
  const logs = await HabitLog.find({ userId }).sort({ completionDate: -1 }).limit(20).lean();
  console.log(`=== RECENT HABIT LOGS (last 20) ===`);
  logs.forEach((l) => {
    const matchingHabit = habits.find(h => h._id.toString() === l.habitId.toString());
    console.log(`  completionDate: ${l.completionDate} | habitId: ${l.habitId} | habit: "${matchingHabit?.title || 'NOT FOUND'}" | category: "${matchingHabit?.category || '?'}"`);
  });
  console.log();

  // 4. Try the exact aggregation the heatmap uses for each category
  const categories = [...new Set(habits.map(h => h.category).filter(Boolean))];
  console.log('=== SIMULATING HEATMAP AGGREGATION PER CATEGORY ===');
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const startDateStr = startDate.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  for (const cat of categories) {
    const matchingHabits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
      category: new RegExp(`^${cat}$`, 'i'),
    }).select('_id').lean();

    const objIdList = matchingHabits
      .map(h => h._id)
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const aggMatch = {
      userId: new mongoose.Types.ObjectId(userId),
      completionDate: { $gte: startDateStr, $lte: todayStr },
      habitId: { $in: objIdList },
    };

    const result = await HabitLog.aggregate([
      { $match: aggMatch },
      { $group: { _id: '$completionDate', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    console.log(`\n  Category: "${cat}" → ${matchingHabits.length} habits, ${objIdList.length} valid ObjectIds`);
    console.log(`    habitIds in category:`, objIdList.map(id => id.toString()));
    if (result.length === 0) {
      console.log(`    ❌ NO logs found in last 30 days for this category`);
    } else {
      console.log(`    ✅ Logs found:`);
      result.forEach(r => console.log(`      ${r._id}: ${r.count} completion(s)`));
    }
  }

  // 5. All logs without filter (to confirm logs exist at all)
  const allLogs = await HabitLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        completionDate: { $gte: startDateStr, $lte: todayStr },
      }
    },
    { $group: { _id: '$completionDate', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  console.log(`\n=== ALL LOGS (no category filter, last 30 days): ${allLogs.length} days with activity ===`);
  allLogs.forEach(r => console.log(`  ${r._id}: ${r.count} completion(s)`));

  console.log('\n=== DIAGNOSIS COMPLETE ===');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
