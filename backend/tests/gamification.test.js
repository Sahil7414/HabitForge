import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  calculateLevel,
  calculateStreakUpdate,
  evaluateBadges,
} from '../utils/gamification.js';
import { getNormalizedToday, getDayDifference, isSameCompletionPeriod } from '../utils/dateUtils.js';

describe('HabitForge End-to-End Logic & Gamification Unit Tests', () => {
  test('calculateLevel formula precision', () => {
    assert.equal(calculateLevel(0), 1);
    assert.equal(calculateLevel(50), 1);
    assert.equal(calculateLevel(100), 2);
    assert.equal(calculateLevel(400), 3);
    assert.equal(calculateLevel(900), 4);
    assert.equal(calculateLevel(1240), 4);
    assert.equal(calculateLevel(2500), 6);
  });

  test('calculateStreakUpdate - first completion', () => {
    const habit = { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    const res = calculateStreakUpdate(habit, '2026-08-25');
    assert.equal(res.currentStreak, 1);
    assert.equal(res.longestStreak, 1);
    assert.equal(res.lastCompletedDate, '2026-08-25');
  });

  test('calculateStreakUpdate - consecutive day completion', () => {
    const habit = {
      frequency: 'DAILY',
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: '2026-08-24',
    };
    const res = calculateStreakUpdate(habit, '2026-08-25');
    assert.equal(res.currentStreak, 6);
    assert.equal(res.longestStreak, 10);
  });

  test('calculateStreakUpdate - missed day resets streak', () => {
    const habit = {
      frequency: 'DAILY',
      currentStreak: 14,
      longestStreak: 14,
      lastCompletedDate: '2026-08-20',
    };
    const res = calculateStreakUpdate(habit, '2026-08-25');
    assert.equal(res.currentStreak, 1);
    assert.equal(res.longestStreak, 14);
  });

  test('calculateStreakUpdate - duplicate check-in throws error', () => {
    const habit = {
      frequency: 'DAILY',
      currentStreak: 3,
      longestStreak: 5,
      lastCompletedDate: '2026-08-25',
    };
    assert.throws(() => calculateStreakUpdate(habit, '2026-08-25'), /DUPLICATE_CHECKIN/);
  });

  test('evaluateBadges unlocks expected badges', () => {
    const user = { xp: 600, badges: [] };
    const habits = [{ currentStreak: 7 }];
    const evalRes = evaluateBadges(user, habits, 30);

    assert.ok(evalRes.updatedBadges.includes('first_step'));
    assert.ok(evalRes.updatedBadges.includes('consistency_starter'));
    assert.ok(evalRes.updatedBadges.includes('consistency_king'));
    assert.ok(evalRes.updatedBadges.includes('habit_master'));
    assert.ok(evalRes.updatedBadges.includes('xp_hunter'));
    assert.equal(evalRes.newlyUnlocked.length, 5);
  });

  test('dateUtils - period boundary check', () => {
    assert.equal(isSameCompletionPeriod('2026-08-25', '2026-08-25', 'DAILY'), true);
    assert.equal(isSameCompletionPeriod('2026-08-24', '2026-08-25', 'DAILY'), false);
    assert.equal(isSameCompletionPeriod('2026-08-24', '2026-08-25', 'WEEKLY'), true);
  });
});
