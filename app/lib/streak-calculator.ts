/**
 * Pure utility functions for daily streak calculation.
 *
 * All date comparisons use ISO date strings (YYYY-MM-DD) to avoid timezone issues.
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * Returns true if both dates represent the same calendar day.
 * Compares ISO date strings (YYYY-MM-DD) directly.
 */
export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Returns true if date2 is exactly one calendar day after date1.
 * Both parameters are ISO date strings (YYYY-MM-DD).
 */
export function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + 'T00:00:00Z');
  const d2 = new Date(date2 + 'T00:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return diffMs === oneDayMs;
}

/**
 * Given the last active date and current streak, returns the new streak value for today.
 *
 * Rules:
 * - If lastActiveDate is today → streak unchanged (already recorded)
 * - If lastActiveDate is yesterday → increment streak by 1
 * - If lastActiveDate is more than 1 day ago (or null) → reset streak to 1
 */
export function calculateStreak(
  lastActiveDate: string | null,
  currentStreak: number,
  today: string
): number {
  if (lastActiveDate === null) {
    return 1;
  }

  if (isSameDay(lastActiveDate, today)) {
    return currentStreak;
  }

  if (isConsecutiveDay(lastActiveDate, today)) {
    return currentStreak + 1;
  }

  // Gap of more than 1 day — reset
  return 1;
}

/**
 * Given the current gamification state, returns the updated state after recording
 * activity for the given day.
 *
 * Updates currentStreak, longestStreak, and lastActiveDate.
 */
export function recordActivity(state: StreakState, today: string): StreakState {
  const newStreak = calculateStreak(state.lastActiveDate, state.currentStreak, today);
  const newLongest = Math.max(state.longestStreak, newStreak);

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: today,
  };
}
