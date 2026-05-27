/**
 * Mastery Challenge Streak Calculator
 *
 * Pure logic for tracking the Mastery_Challenge_Streak — a streak counter
 * that increments when a user completes a Daily_Challenge on consecutive
 * calendar days. This is distinct from the general daily-activity streak
 * in the auth-persistence-gamification spec.
 *
 * Streak milestones award bonus XP:
 *   - 3 consecutive days: 50 XP
 *   - 7 consecutive days: 150 XP
 *   - 30 consecutive days: 750 XP
 *
 * Bonuses are tracked per `run_id` to ensure idempotent awarding across
 * sync replays. A new `run_id` is generated on every streak reset.
 */

import { MasteryStreakState, StreakDelta } from '@/app/types/mastery';

/** Milestone definitions: streak length → XP bonus */
const STREAK_MILESTONES: ReadonlyArray<{ length: 3 | 7 | 30; xp: 50 | 150 | 750 }> = [
  { length: 3, xp: 50 },
  { length: 7, xp: 150 },
  { length: 30, xp: 750 },
];

/**
 * Returns an ISO date string (YYYY-MM-DD) from a Date object,
 * using the local calendar date.
 */
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if date2 is exactly one calendar day after date1.
 * Both parameters are ISO date strings (YYYY-MM-DD).
 */
function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + 'T00:00:00Z');
  const d2 = new Date(date2 + 'T00:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return diffMs === oneDayMs;
}

/**
 * Returns true if both dates represent the same calendar day.
 */
function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Generates a simple UUID v4 string for run_id tracking.
 */
function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Applies a streak increment when a Daily_Challenge is completed.
 *
 * Logic:
 * - If `lastCompletedDate` is today → no-op (already counted today)
 * - If `lastCompletedDate` is yesterday → increment streak
 * - Otherwise → reset streak to 1 (new run)
 *
 * After incrementing, checks if the new streak length hits a milestone
 * (3, 7, or 30) that hasn't already been awarded in this run.
 *
 * @param state - Current streak state
 * @param today - The current date (Date object, uses local calendar day)
 * @returns StreakDelta with the next state and any bonus earned
 */
export function applyStreakIncrement(state: MasteryStreakState, today: Date): StreakDelta {
  const todayStr = toDateString(today);

  // If already completed today, no change
  if (state.lastCompletedDate !== null && isSameDay(state.lastCompletedDate, todayStr)) {
    return { next: state, bonusEarned: null };
  }

  let newStreak: number;
  let newRunId: string;
  let newBonusesAwarded: Array<3 | 7 | 30>;

  if (state.lastCompletedDate !== null && isConsecutiveDay(state.lastCompletedDate, todayStr)) {
    // Consecutive day — increment within the same run
    newStreak = state.currentStreak + 1;
    newRunId = state.runId;
    newBonusesAwarded = [...state.bonusesAwardedInRun];
  } else {
    // Gap of more than 1 day (or first ever completion) — new run starts at 1
    newStreak = 1;
    newRunId = generateRunId();
    newBonusesAwarded = [];
  }

  const newLongest = Math.max(state.longestStreak, newStreak);

  // Check for milestone bonus (idempotent per run)
  let bonusEarned: StreakDelta['bonusEarned'] = null;
  for (const milestone of STREAK_MILESTONES) {
    if (newStreak === milestone.length && !newBonusesAwarded.includes(milestone.length)) {
      bonusEarned = { length: milestone.length, xp: milestone.xp };
      newBonusesAwarded = [...newBonusesAwarded, milestone.length];
      break; // Only one milestone can be hit per increment
    }
  }

  const next: MasteryStreakState = {
    userId: state.userId,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastCompletedDate: todayStr,
    runId: newRunId,
    bonusesAwardedInRun: newBonusesAwarded,
  };

  return { next, bonusEarned };
}

/**
 * Resets the streak to zero. Called when a user does not complete a
 * Daily_Challenge before its slot refreshes.
 *
 * Generates a new `run_id` and clears `bonusesAwardedInRun` so that
 * future milestones in the next run can be awarded fresh.
 *
 * @param state - Current streak state
 * @returns The reset MasteryStreakState
 */
export function applyStreakReset(state: MasteryStreakState): MasteryStreakState {
  return {
    userId: state.userId,
    currentStreak: 0,
    longestStreak: state.longestStreak, // longest is never reduced
    lastCompletedDate: state.lastCompletedDate, // preserve for reference
    runId: generateRunId(), // new run
    bonusesAwardedInRun: [], // clear bonuses for new run
  };
}
