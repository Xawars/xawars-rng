import fc from 'fast-check';
import { applyStreakIncrement, applyStreakReset } from '../streak-calculator';
import type { MasteryStreakState, StreakDelta } from '@/app/types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 14: Mastery_Challenge_Streak length and bonus idempotency
 *
 * **Validates: Requirements 9.1, 9.2, 9.3**
 *
 * For any sequence of daily-challenge-completion events with calendar dates, after applying
 * the sequence: `current_streak` equals the length of the longest consecutive-calendar-day
 * run ending at the most recent completion, or `0` if the most recent completion is not
 * yesterday or today; `longest_streak` is the maximum value `current_streak` ever held
 * during the sequence; and for any bonus length L ∈ {3, 7, 30} and for any run identified
 * by `run_id`, the `mastery_streak_bonus` XP for L is awarded at most once per `run_id`
 * even when the streak hits L multiple times across replays.
 */
describe('Feature: operator-mastery-mvp, Property 14: Mastery_Challenge_Streak length and bonus idempotency', () => {
  // --- Arbitraries ---

  /** Generate a base date as a number of days offset from a fixed epoch (2024-01-01) */
  const baseDayOffsetArb = fc.integer({ min: 0, max: 365 });

  /** Generate a sequence of day offsets (sorted ascending) representing completion dates */
  const completionDaysArb = fc
    .array(fc.integer({ min: 0, max: 120 }), { minLength: 1, maxLength: 40 })
    .map((days) => [...new Set(days)].sort((a, b) => a - b));

  /** Generate a fresh MasteryStreakState */
  function freshState(userId = 'user-test'): MasteryStreakState {
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      runId: 'initial-run-id',
      bonusesAwardedInRun: [],
    };
  }

  /** Convert a day offset to a Date object (relative to 2024-01-01) */
  function dayToDate(dayOffset: number): Date {
    return new Date(2024, 0, 1 + dayOffset);
  }

  /** Apply a sequence of completion events and return all intermediate states and bonuses */
  function applySequence(days: number[]): {
    states: MasteryStreakState[];
    bonuses: Array<StreakDelta['bonusEarned']>;
  } {
    const states: MasteryStreakState[] = [];
    const bonuses: Array<StreakDelta['bonusEarned']> = [];
    let state = freshState();

    for (const day of days) {
      const result = applyStreakIncrement(state, dayToDate(day));
      state = result.next;
      states.push(state);
      bonuses.push(result.bonusEarned);
    }

    return { states, bonuses };
  }

  /**
   * Compute the expected streak length for a sequence of unique sorted days.
   * The streak is the length of the longest consecutive-day run ending at the last day.
   */
  function expectedStreakLength(days: number[]): number {
    if (days.length === 0) return 0;
    let streak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i] - days[i - 1] === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // --- Properties ---

  /**
   * Streak length equals the number of consecutive days ending at the most recent completion.
   *
   * Validates: Requirement 9.1
   */
  it('streak length equals consecutive days ending at most recent completion', () => {
    fc.assert(
      fc.property(completionDaysArb, (days) => {
        const { states } = applySequence(days);
        const finalState = states[states.length - 1];
        const expected = expectedStreakLength(days);
        expect(finalState.currentStreak).toBe(expected);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Streak resets to 1 when there's a gap > 1 day between completions.
   *
   * Validates: Requirement 9.2
   */
  it('streak resets to 1 when there is a gap > 1 day', () => {
    // Generate pairs of days with a guaranteed gap > 1
    const gapPairArb = fc.tuple(
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 3, max: 60 }) // gap of at least 3 ensures > 1 day difference
    ).map(([first, gap]) => [first, first + gap] as [number, number]);

    fc.assert(
      fc.property(gapPairArb, ([day1, day2]) => {
        fc.pre(day2 - day1 > 1); // ensure gap > 1 day

        let state = freshState();
        // Complete on day1
        const r1 = applyStreakIncrement(state, dayToDate(day1));
        state = r1.next;
        expect(state.currentStreak).toBe(1);

        // Complete on day2 (gap > 1)
        const r2 = applyStreakIncrement(state, dayToDate(day2));
        expect(r2.next.currentStreak).toBe(1); // reset to 1
        expect(r2.next.runId).not.toBe(state.runId); // new run
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Same-day completions are no-ops — calling applyStreakIncrement twice on the same day
   * returns the same state (reference equality).
   *
   * Validates: Requirement 9.1 (idempotent daily tracking)
   */
  it('same-day completions are no-ops', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (startDay, completionDay) => {
          const day = startDay + completionDay;
          let state = freshState();

          // First completion on the day
          const r1 = applyStreakIncrement(state, dayToDate(day));
          state = r1.next;

          // Second completion on the same day — should be a no-op
          const r2 = applyStreakIncrement(state, dayToDate(day));
          expect(r2.next).toBe(state); // exact same reference
          expect(r2.bonusEarned).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Bonuses are awarded exactly once per milestone per run (idempotent).
   * If a milestone has already been awarded in the current run, replaying
   * the same streak length does not re-award it.
   *
   * Validates: Requirement 9.3
   */
  it('bonuses are awarded at most once per milestone per run', () => {
    fc.assert(
      fc.property(completionDaysArb, (days) => {
        const { bonuses, states } = applySequence(days);

        // Group bonuses by run_id
        const bonusesByRun = new Map<string, Array<3 | 7 | 30>>();
        for (let i = 0; i < states.length; i++) {
          const bonus = bonuses[i];
          if (bonus !== null) {
            const runId = states[i].runId;
            const existing = bonusesByRun.get(runId) ?? [];
            existing.push(bonus.length);
            bonusesByRun.set(runId, existing);
          }
        }

        // For each run, each milestone length should appear at most once
        for (const [, awarded] of bonusesByRun) {
          const uniqueLengths = new Set(awarded);
          expect(awarded.length).toBe(uniqueLengths.size);
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Bonus milestones are awarded with correct XP values:
   * 3 days = 50 XP, 7 days = 150 XP, 30 days = 750 XP.
   *
   * Validates: Requirement 9.3
   */
  it('bonus milestones award correct XP values', () => {
    const milestoneXpMap: Record<number, number> = { 3: 50, 7: 150, 30: 750 };

    fc.assert(
      fc.property(completionDaysArb, (days) => {
        const { bonuses } = applySequence(days);

        for (const bonus of bonuses) {
          if (bonus !== null) {
            expect(milestoneXpMap[bonus.length]).toBe(bonus.xp);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * longest_streak is the maximum value current_streak ever held during the sequence.
   *
   * Validates: Requirement 9.1
   */
  it('longest_streak is the maximum current_streak ever observed', () => {
    fc.assert(
      fc.property(completionDaysArb, (days) => {
        const { states } = applySequence(days);
        const finalState = states[states.length - 1];

        // longest_streak should be >= all intermediate current_streak values
        const maxObserved = Math.max(...states.map((s) => s.currentStreak));
        expect(finalState.longestStreak).toBe(maxObserved);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * applyStreakReset sets currentStreak to 0 and generates a new run_id.
   * bonusesAwardedInRun is cleared, longestStreak is preserved.
   *
   * Validates: Requirement 9.2
   */
  it('applyStreakReset sets currentStreak to 0 with new run_id', () => {
    const streakArb = fc.integer({ min: 1, max: 100 });
    const longestArb = fc.integer({ min: 1, max: 200 });
    const bonusesArb = fc.subarray([3, 7, 30] as Array<3 | 7 | 30>, { minLength: 0, maxLength: 3 });

    fc.assert(
      fc.property(streakArb, longestArb, bonusesArb, (streak, longest, bonuses) => {
        const state: MasteryStreakState = {
          userId: 'user-test',
          currentStreak: streak,
          longestStreak: Math.max(longest, streak),
          lastCompletedDate: '2024-06-15',
          runId: 'old-run-id',
          bonusesAwardedInRun: bonuses,
        };

        const result = applyStreakReset(state);

        expect(result.currentStreak).toBe(0);
        expect(result.runId).not.toBe(state.runId); // new run_id
        expect(result.bonusesAwardedInRun).toEqual([]); // cleared
        expect(result.longestStreak).toBe(state.longestStreak); // preserved
        expect(result.userId).toBe(state.userId); // preserved
        expect(result.lastCompletedDate).toBe(state.lastCompletedDate); // preserved
      }),
      { numRuns: 200 }
    );
  });

  /**
   * After a reset, a new run can re-earn milestones that were earned in the previous run.
   * This validates that run_id isolation works correctly for bonus idempotency.
   *
   * Validates: Requirement 9.3
   */
  it('after reset, milestones can be re-earned in a new run', () => {
    // Build a streak of 3 consecutive days, earn the 3-day bonus, reset, then rebuild
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (startDay) => {
        let state = freshState();

        // Build streak to 3 (days startDay, startDay+1, startDay+2)
        for (let i = 0; i < 3; i++) {
          const result = applyStreakIncrement(state, dayToDate(startDay + i));
          state = result.next;
          if (i === 2) {
            // Should earn the 3-day bonus
            expect(result.bonusEarned).toEqual({ length: 3, xp: 50 });
          }
        }

        const firstRunId = state.runId;
        expect(state.bonusesAwardedInRun).toContain(3);

        // Reset
        state = applyStreakReset(state);
        expect(state.runId).not.toBe(firstRunId);
        expect(state.bonusesAwardedInRun).toEqual([]);

        // Build a new streak of 3 (with a gap to force new run on increment)
        const newStart = startDay + 10; // gap ensures new run
        for (let i = 0; i < 3; i++) {
          const result = applyStreakIncrement(state, dayToDate(newStart + i));
          state = result.next;
          if (i === 2) {
            // Should earn the 3-day bonus again in the new run
            expect(result.bonusEarned).toEqual({ length: 3, xp: 50 });
          }
        }

        expect(state.bonusesAwardedInRun).toContain(3);
        expect(state.runId).not.toBe(firstRunId);
      }),
      { numRuns: 100 }
    );
  });
});
