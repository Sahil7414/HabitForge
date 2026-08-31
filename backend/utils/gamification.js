import { getNormalizedToday, getDayDifference, getWeekDifference, isSameCompletionPeriod } from './dateUtils.js';

export const XP_CONFIG = {
  BASE_COMPLETION: 10,
  BONUS_STREAK_7: 25,
  BONUS_STREAK_30: 100,
};

/**
 * Calculates level derived consistently from total XP.
 * Formula: Level = Math.floor(Math.sqrt(XP / 100)) + 1
 */
export function calculateLevel(xp) {
  if (!xp || xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculates current active streak for display (resets to 0 if completion period missed)
 */
export function getActiveStreak(habit, todayStr = getNormalizedToday()) {
  if (!habit || !habit.lastCompletedDate) return 0;
  const lastDate = habit.lastCompletedDate;
  const freq = habit.frequency || 'DAILY';

  if (freq === 'DAILY') {
    const diffDays = getDayDifference(todayStr, lastDate);
    if (diffDays <= 1) {
      return habit.currentStreak || 0;
    }
    return 0;
  } else if (freq === 'WEEKLY') {
    const weekDiff = getWeekDifference(todayStr, lastDate);
    if (weekDiff <= 1) {
      return habit.currentStreak || 0;
    }
    return 0;
  }
  return habit.currentStreak || 0;
}

/**
 * Gamification Streak Engine for daily and weekly habits.
 */
export function calculateStreakUpdate(habit, todayStr = getNormalizedToday()) {
  const lastDate = habit.lastCompletedDate;
  const freq = habit.frequency || 'DAILY';

  // Duplicate Check-in Prevention per calendar day
  if (lastDate === todayStr) {
    throw new Error('DUPLICATE_CHECKIN: Habit already completed for today');
  }

  let newCurrentStreak = getActiveStreak(habit, todayStr);

  if (!lastDate) {
    // First time completing this habit
    newCurrentStreak = 1;
  } else if (freq === 'DAILY') {
    const diffDays = getDayDifference(todayStr, lastDate);
    if (diffDays === 1) {
      // Completed yesterday -> increment streak
      newCurrentStreak += 1;
    } else {
      // Missed required day -> reset streak to 1
      newCurrentStreak = 1;
    }
  } else if (freq === 'WEEKLY') {
    const weekDiff = getWeekDifference(todayStr, lastDate);
    if (weekDiff === 1) {
      // Completed in consecutive week -> increment streak
      newCurrentStreak += 1;
    } else if (weekDiff === 0) {
      // Additional completion within current week -> preserve active streak
      newCurrentStreak = Math.max(1, habit.currentStreak || 1);
    } else {
      // Missed a week -> reset streak to 1
      newCurrentStreak = 1;
    }
  }

  const newLongestStreak = Math.max(newCurrentStreak, habit.longestStreak || 0);

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastCompletedDate: todayStr,
  };
}

/**
 * Evaluates unlocked badges based on user stats and habit streaks.
 */
export function evaluateBadges(user, userHabits = [], totalCompletions = 0) {
  const currentBadges = new Set(user.badges || []);
  const newlyUnlocked = [];

  const maxStreak = Math.max(0, ...userHabits.map((h) => h.currentStreak || 0));

  // Badge 1: First Step (First completion)
  if (totalCompletions >= 1 && !currentBadges.has('first_step')) {
    currentBadges.add('first_step');
    newlyUnlocked.push('first_step');
  }

  // Badge 2: Consistency Starter (3-day streak)
  if (maxStreak >= 3 && !currentBadges.has('consistency_starter')) {
    currentBadges.add('consistency_starter');
    newlyUnlocked.push('consistency_starter');
  }

  // Badge 3: Consistency King (7-day streak)
  if (maxStreak >= 7 && !currentBadges.has('consistency_king')) {
    currentBadges.add('consistency_king');
    newlyUnlocked.push('consistency_king');
  }

  // Badge 4: Habit Master (30 total completions)
  if (totalCompletions >= 30 && !currentBadges.has('habit_master')) {
    currentBadges.add('habit_master');
    newlyUnlocked.push('habit_master');
  }

  // Badge 5: XP Hunter (500 XP)
  if (user.xp >= 500 && !currentBadges.has('xp_hunter')) {
    currentBadges.add('xp_hunter');
    newlyUnlocked.push('xp_hunter');
  }

  // Badge 6: Century Club (100 total completions)
  if (totalCompletions >= 100 && !currentBadges.has('century_club')) {
    currentBadges.add('century_club');
    newlyUnlocked.push('century_club');
  }

  return {
    updatedBadges: Array.from(currentBadges),
    newlyUnlocked,
  };
}
