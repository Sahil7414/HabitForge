import mongoose from 'mongoose';
import { HabitLog } from '../models/HabitLog.js';
import { Habit } from '../models/Habit.js';
import { format, subDays, addDays, getDay, startOfWeek, endOfWeek, isBefore, isAfter, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

// @desc    Get completion stats for line/bar chart with period filtering
// @route   GET /api/analytics/completions?period=7d|30d|90d|1y
export const get30DayCompletions = async (req, res) => {
  try {
    const { period, category } = req.query;
    const today = new Date();
    let startDate;
    let days;

    if (period === '7d') {
      days = 7;
      startDate = subDays(today, 6);
    } else if (period === '1m' || period === '30d') {
      // Calendar Month View: Start from 1st of the month
      if (today.getDate() <= 7) {
        const prevMonth = subDays(today, today.getDate() + 1);
        startDate = startOfMonth(prevMonth);
      } else {
        startDate = startOfMonth(today);
      }
      days = differenceInCalendarDays(today, startDate) + 1;
    } else if (period === '90d') {
      days = 90;
      startDate = subDays(today, 89);
    } else if (period === '1y') {
      days = 365;
      startDate = subDays(today, 364);
    } else {
      days = 7;
      startDate = subDays(today, 6);
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const userIdStr = (req.user._id || req.user.id).toString();

    const logMap = {};
    const habitCountMap = {};

    let userObjId = req.user._id;
    if (typeof userObjId === 'string' && mongoose.Types.ObjectId.isValid(userObjId)) {
      userObjId = new mongoose.Types.ObjectId(userObjId);
    }

    let hasZeroCategoryHabits = false;
    let matchingHabitsForCompletions = null;

    if (category && category !== 'All' && category !== 'All Categories') {
      const cleanCat = category.replace(/[^\w\s-]/gi, '').trim();
      const catRegex = new RegExp(`^${cleanCat}$`, 'i');

      matchingHabitsForCompletions = await Habit.find({
        userId: userObjId,
        category: catRegex,
      }).select('_id');

      if (matchingHabitsForCompletions.length === 0) {
        hasZeroCategoryHabits = true;
      }
    }

    let userHabits = [];

    if (hasZeroCategoryHabits) {
      // 0 habits found in category: logMap remains empty ({})
    } else if (isMongoConnected()) {
      const aggMatch = {
        userId: userObjId,
        completionDate: { $gte: startDateStr },
      };
      if (matchingHabitsForCompletions !== null) {
        const objIdList = matchingHabitsForCompletions
          .map((h) => h._id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        aggMatch.habitId = { $in: objIdList };
      }

      const habitFilter = { userId: userObjId, isArchived: false };
      if (matchingHabitsForCompletions !== null) {
        habitFilter._id = { $in: matchingHabitsForCompletions.map((h) => h._id) };
      }
      userHabits = await Habit.find(habitFilter);

      const [dateLogs, habitLogs] = await Promise.all([
        HabitLog.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: '$completionDate',
              completions: { $sum: 1 },
            },
          },
        ]),
        HabitLog.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: '$habitId',
              completions: { $sum: 1 },
            },
          },
        ]),
      ]);

      dateLogs.forEach((item) => {
        logMap[item._id] = item.completions;
      });
      habitLogs.forEach((item) => {
        habitCountMap[item._id.toString()] = item.completions;
      });
    } else {
      let categoryHabitIds = null;
      if (category && category !== 'All' && category !== 'All Categories') {
        const cleanCat = category.replace(/[^\w\s-]/gi, '').trim().toLowerCase();
        categoryHabitIds = new Set(
          inMemoryDB.habits
            .filter((h) => h.userId === userIdStr && (h.category || '').toLowerCase().includes(cleanCat))
            .map((h) => (h._id || h.id).toString())
        );
      }

      userHabits = inMemoryDB.habits.filter((h) => h.userId === userIdStr && !h.isArchived);
      if (categoryHabitIds) {
        userHabits = userHabits.filter((h) => categoryHabitIds.has((h._id || h.id).toString()));
      }

      const userLogs = inMemoryDB.habitLogs.filter((l) => {
        const matchesUser = l.userId === userIdStr;
        const matchesRange = l.completionDate >= startDateStr;
        const matchesCat = !categoryHabitIds || categoryHabitIds.has(l.habitId?.toString());
        return matchesUser && matchesRange && matchesCat;
      });

      userLogs.forEach((l) => {
        logMap[l.completionDate] = (logMap[l.completionDate] || 0) + 1;
        const hid = (l.habitId || '').toString();
        habitCountMap[hid] = (habitCountMap[hid] || 0) + 1;
      });
    }

    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const label = format(d, days > 90 ? 'MMM d, yyyy' : 'MMM d');
      chartData.push({
        date: label,
        fullDate: dateStr,
        completions: logMap[dateStr] || 0,
      });
    }

    const habitBreakdown = userHabits.map((h) => {
      const idStr = (h._id || h.id).toString();
      const completions = habitCountMap[idStr] || 0;
      let target = days;
      if (h.frequency === 'WEEKLY') {
        target = Math.max(1, Math.round(days / 7));
      }
      const rate = Math.min(100, Math.round((completions / target) * 100));
      return {
        id: idStr,
        name: h.title,
        icon: h.icon || '🏃',
        color: h.color || '#d0bcff',
        rate,
        completions,
        totalCompletions: h.totalCompletions || completions,
      };
    });

    res.json({ chartData, habitBreakdown });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get activity heatmap data (aligned to Sunday-Saturday calendar weeks)
// @route   GET /api/analytics/heatmap?days=365&habitId=...
export const getHeatmap = async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10) || 90;
    const isPremiumActive =
      req.user &&
      req.user.isPremium &&
      (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date());

    if (days > 90 && !isPremiumActive) {
      days = 90; // Limit free users to 90 days
    }
    const { habitId, category } = req.query;


    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    let startDate;

    if (days === 30) {
      if (today.getDate() <= 7) {
        const prevMonth = subDays(today, today.getDate() + 1);
        startDate = startOfMonth(prevMonth);
      } else {
        startDate = startOfMonth(today);
      }
    } else {
      startDate = subDays(today, days - 1);
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const userIdStr = (req.user._id || req.user.id).toString();

    // Align calendar start date to preceding Sunday (0)
    const calendarStartDate = startOfWeek(startDate, { weekStartsOn: 0 });
    // Align calendar end date to following Saturday (6)
    const calendarEndDate = endOfWeek(today, { weekStartsOn: 0 });

    let userObjId = req.user._id;
    if (typeof userObjId === 'string' && mongoose.Types.ObjectId.isValid(userObjId)) {
      userObjId = new mongoose.Types.ObjectId(userObjId);
    }

    const logMap = {};

    let hasZeroCategoryHabits = false;
    let matchingHabitsForHeatmap = null;

    if (category && category !== 'All' && category !== 'All Categories') {
      const cleanCat = category.replace(/[^\w\s-]/gi, '').trim();
      const catRegex = new RegExp(`^${cleanCat}$`, 'i');

      matchingHabitsForHeatmap = await Habit.find({
        userId: userObjId,
        category: catRegex,
      }).select('_id');

      if (matchingHabitsForHeatmap.length === 0) {
        hasZeroCategoryHabits = true;
      }
    } else if (habitId && mongoose.Types.ObjectId.isValid(habitId)) {
      // single habit filter — wrap in array for reuse
      matchingHabitsForHeatmap = [{ _id: new mongoose.Types.ObjectId(habitId) }];
    }

    if (hasZeroCategoryHabits) {
      // 0 habits found in category: logMap remains empty ({})
    } else if (isMongoConnected()) {
      // HabitLog stores userId and habitId as ObjectId.
      // Aggregation $match does NOT auto-cast strings — we must pass ObjectId directly.
      const aggMatch = {
        userId: userObjId,
        completionDate: { $gte: startDateStr, $lte: todayStr },
      };
      if (matchingHabitsForHeatmap !== null) {
        // Category or habitId filter active — restrict to matching habit ObjectIds
        const objIdList = matchingHabitsForHeatmap
          .map((h) => h._id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        aggMatch.habitId = { $in: objIdList };
      }

      const logs = await HabitLog.aggregate([
        { $match: aggMatch },
        {
          $group: {
            _id: '$completionDate',
            count: { $sum: 1 },
          },
        },
      ]);
      logs.forEach((item) => {
        logMap[item._id] = item.count;
      });
    } else {
      let categoryHabitIds = null;
      if (category && category !== 'All' && category !== 'All Categories') {
        const cleanCat = category.replace(/[^\w\s-]/gi, '').trim().toLowerCase();
        categoryHabitIds = new Set(
          inMemoryDB.habits
            .filter((h) => h.userId === userIdStr && (h.category || '').toLowerCase().includes(cleanCat))
            .map((h) => (h._id || h.id).toString())
        );
      }

      const userLogs = inMemoryDB.habitLogs.filter((l) => {
        const matchesUser = l.userId === userIdStr;
        const matchesRange = l.completionDate >= startDateStr && l.completionDate <= todayStr;
        const matchesHabit = !habitId || l.habitId === habitId;
        const matchesCat = !categoryHabitIds || categoryHabitIds.has(l.habitId?.toString());
        return matchesUser && matchesRange && matchesHabit && matchesCat;
      });
      userLogs.forEach((l) => {
        logMap[l.completionDate] = (logMap[l.completionDate] || 0) + 1;
      });
    }

    const heatmapCells = [];
    let curr = calendarStartDate;
    let totalCompletions = 0;
    let activeDaysCount = 0;

    while (curr <= calendarEndDate) {
      const dateStr = format(curr, 'yyyy-MM-dd');
      const displayDate = format(curr, 'MMM d, yyyy');
      const monthStr = format(curr, 'MMM');
      const dayOfWeek = getDay(curr); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      const isBeforeStart = isBefore(curr, startDate) && dateStr !== startDateStr;
      const isFutureDate = isAfter(curr, today) && dateStr !== todayStr;
      const isPlaceholder = isBeforeStart;

      let count = 0;
      if (!isPlaceholder && !isFutureDate) {
        count = logMap[dateStr] || 0;
        totalCompletions += count;
        if (count > 0) activeDaysCount++;
      }

      heatmapCells.push({
        date: displayDate,
        fullDate: dateStr,
        monthStr,
        dayOfWeek,
        count,
        isFuture: isFutureDate,
        isPlaceholder,
      });

      curr = addDays(curr, 1);
    }

    res.json({
      cells: heatmapCells,
      totalCompletions,
      activeDaysCount,
      rangeDays: days,
      startDate: startDateStr,
      endDate: todayStr,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get detailed completions for a specific date
// @route   GET /api/analytics/day-details?date=YYYY-MM-DD
export const getDayDetails = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const userIdStr = (req.user._id || req.user.id).toString();
    let logs = [];

    if (isMongoConnected()) {
      logs = await HabitLog.find({ userId: req.user._id, completionDate: date })
        .populate('habitId', 'title icon color category frequency')
        .sort({ completedAt: -1 });
    } else {
      logs = inMemoryDB.habitLogs.filter(
        (l) => l.userId === userIdStr && l.completionDate === date
      );
    }

    res.json({
      date,
      count: logs.length,
      logs: logs.map((l) => ({
        id: l._id || l.id,
        habitTitle: l.habitId?.title || 'General Habit',
        icon: l.habitId?.icon || '🏃',
        color: l.habitId?.color || '#d0bcff',
        category: l.habitId?.category || 'Health',
        completedAt: l.completedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get overall analytics summary with advanced metrics
// @route   GET /api/analytics/overview
export const getAnalyticsOverview = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();
    let habits = [];
    let totalCompletions = 0;
    let logs30Count = 0;
    let logs7Count = 0;
    let todayCount = 0;

    const today = new Date();
    const last30Str = format(subDays(today, 30), 'yyyy-MM-dd');
    const last7Str = format(subDays(today, 7), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    if (isMongoConnected()) {
      habits = await Habit.find({ userId: req.user._id, isArchived: false });
      totalCompletions = await HabitLog.countDocuments({ userId: req.user._id });

      [logs30Count, logs7Count, todayCount] = await Promise.all([
        HabitLog.countDocuments({ userId: req.user._id, completionDate: { $gte: last30Str } }),
        HabitLog.countDocuments({ userId: req.user._id, completionDate: { $gte: last7Str } }),
        HabitLog.countDocuments({ userId: req.user._id, completionDate: todayStr }),
      ]);
    } else {
      habits = inMemoryDB.habits.filter((h) => h.userId === userIdStr && !h.isArchived);
      const userLogs = inMemoryDB.habitLogs.filter((l) => l.userId === userIdStr);
      totalCompletions = userLogs.length;
      logs30Count = userLogs.filter((l) => l.completionDate >= last30Str).length;
      logs7Count = userLogs.filter((l) => l.completionDate >= last7Str).length;
      todayCount = userLogs.filter((l) => l.completionDate === todayStr).length;
    }

    const maxStreak = Math.max(0, ...habits.map((h) => h.currentStreak || 0));
    const maxLongestStreak = Math.max(0, ...habits.map((h) => h.longestStreak || 0));

    const activeCount = habits.filter((h) => h.isActive !== false && !h.isPaused).length;
    const weeklyTarget = activeCount * 7;
    const monthlyTarget = activeCount * 30;

    const weeklyCompletionRate = weeklyTarget > 0 ? Math.min(100, Math.round((logs7Count / weeklyTarget) * 100)) : 0;
    const monthlyCompletionRate = monthlyTarget > 0 ? Math.min(100, Math.round((logs30Count / monthlyTarget) * 100)) : 0;

    let mostConsistent = null;
    let leastConsistent = null;
    if (habits.length > 0) {
      const sorted = [...habits].sort((a, b) => b.totalCompletions - a.totalCompletions);
      if (sorted[0].totalCompletions > 0) {
        mostConsistent = { title: sorted[0].title, completions: sorted[0].totalCompletions };
      }
      if (sorted[sorted.length - 1].totalCompletions > 0) {
        leastConsistent = { title: sorted[sorted.length - 1].title, completions: sorted[sorted.length - 1].totalCompletions };
      }
    }

    const averageDailyCompletions = (logs30Count / 30).toFixed(1);

    res.json({
      totalCompletions,
      currentStreak: maxStreak,
      longestStreak: maxLongestStreak,
      habitsCompletedToday: todayCount,
      weeklyCompletionRate,
      monthlyCompletionRate,
      averageDailyCompletions,
      mostConsistent,
      leastConsistent,
      activeHabitCount: activeCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export habit history as CSV (Premium required)
// @route   GET /api/analytics/export
export const exportHabitDataCSV = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();
    const userName = (req.user.name || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `habitforge_${userName}_export_${dateStr}.csv`;

    let csvContent = 'Habit,Category,Frequency,Completion Date,Status\n';

    if (isMongoConnected()) {
      const logs = await HabitLog.find({ userId: req.user._id })
        .populate('habitId', 'title category frequency')
        .sort({ completionDate: -1 });

      logs.forEach((log) => {
        const habitTitle = log.habitId ? log.habitId.title.replace(/,/g, ' ') : 'General Habit';
        const category = log.habitId ? log.habitId.category : 'Health';
        const frequency = log.habitId ? log.habitId.frequency : 'DAILY';
        const date = log.completionDate;
        csvContent += `"${habitTitle}","${category}","${frequency}","${date}","Completed"\n`;
      });
    } else {
      const logs = inMemoryDB.habitLogs.filter((l) => l.userId === userIdStr);
      logs.forEach((log) => {
        csvContent += `"General Habit","Health","DAILY","${log.completionDate}","Completed"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};
