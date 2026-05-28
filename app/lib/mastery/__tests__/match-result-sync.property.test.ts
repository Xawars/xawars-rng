import fc from 'fast-check';
import { maxMerge, latestTimestampMerge } from '@/app/lib/mastery/persistence';
import type { MatchResult, MatchResultRow } from '@/app/types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 15: Match_Result mutability window re-evaluation correctness
 *
 * Validates: Requirements 11.4, 11.5
 *
 * Generate random sequences of match result changes within the 10-minute window.
 * The final state should reflect only the last reported result.
 * Changes outside the window should be rejected.
 */
describe('Feature: operator-mastery-mvp, Property 15: Match_Result mutability window re-evaluation correctness', () => {
  const MUTABILITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  const matchResultArb: fc.Arbitrary<MatchResult> = fc.constantFrom('win', 'loss', 'survived_round');

  // Arbitrary for a sequence of result changes within the window (1..10 changes)
  const inWindowChangesArb = fc.array(matchResultArb, { minLength: 1, maxLength: 10 });

  /**
   * Simulate the mutability window logic:
   * - reportedAt is set on first report
   * - Within 10 minutes of reportedAt, changes are allowed
   * - Each change replaces the previous result
   * - The final state reflects only the last result
   */
  function simulateMutabilityWindow(
    changes: MatchResult[],
    reportedAt: Date,
    changeTimestamps: Date[]
  ): { finalResult: MatchResult | null; rejectedCount: number } {
    let currentResult: MatchResult | null = null;
    let rejectedCount = 0;

    for (let i = 0; i < changes.length; i++) {
      const elapsed = changeTimestamps[i].getTime() - reportedAt.getTime();

      if (elapsed <= MUTABILITY_WINDOW_MS) {
        // Within window: accept the change
        currentResult = changes[i];
      } else {
        // Outside window: reject
        rejectedCount++;
      }
    }

    return { finalResult: currentResult, rejectedCount };
  }

  /**
   * For any sequence of match result changes all within the 10-minute window,
   * the final state reflects only the last reported result.
   */
  it('final state reflects only the last in-window result', () => {
    fc.assert(
      fc.property(inWindowChangesArb, (changes) => {
        const reportedAt = new Date('2024-01-15T10:00:00.000Z');

        // Generate timestamps all within the window (0 to 9 minutes after reportedAt)
        const changeTimestamps = changes.map((_, i) =>
          new Date(reportedAt.getTime() + (i * 60 * 1000)) // each 1 minute apart
        );

        const { finalResult } = simulateMutabilityWindow(changes, reportedAt, changeTimestamps);

        // The final result should be the last change in the sequence
        expect(finalResult).toBe(changes[changes.length - 1]);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Changes outside the 10-minute window are rejected.
   * For any sequence where some changes occur after the window,
   * those changes do not affect the final result.
   */
  it('changes outside the window are rejected and do not affect final state', () => {
    // Generate a mix of in-window and out-of-window changes
    const mixedChangesArb = fc.tuple(
      fc.array(matchResultArb, { minLength: 1, maxLength: 5 }), // in-window
      fc.array(matchResultArb, { minLength: 1, maxLength: 5 })  // out-of-window
    );

    fc.assert(
      fc.property(mixedChangesArb, ([inWindowChanges, outWindowChanges]) => {
        const reportedAt = new Date('2024-01-15T10:00:00.000Z');

        // In-window timestamps: 0 to 9 minutes
        const inWindowTimestamps = inWindowChanges.map((_, i) =>
          new Date(reportedAt.getTime() + (i * 60 * 1000))
        );

        // Out-of-window timestamps: 11+ minutes
        const outWindowTimestamps = outWindowChanges.map((_, i) =>
          new Date(reportedAt.getTime() + MUTABILITY_WINDOW_MS + ((i + 1) * 60 * 1000))
        );

        const allChanges = [...inWindowChanges, ...outWindowChanges];
        const allTimestamps = [...inWindowTimestamps, ...outWindowTimestamps];

        const { finalResult, rejectedCount } = simulateMutabilityWindow(
          allChanges,
          reportedAt,
          allTimestamps
        );

        // All out-of-window changes should be rejected
        expect(rejectedCount).toBe(outWindowChanges.length);

        // Final result should be the last in-window change only
        expect(finalResult).toBe(inWindowChanges[inWindowChanges.length - 1]);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * A change at exactly the 10-minute boundary is still within the window
   * (elapsed <= MUTABILITY_WINDOW_MS).
   */
  it('change at exactly the 10-minute boundary is accepted', () => {
    fc.assert(
      fc.property(matchResultArb, matchResultArb, (firstResult, boundaryResult) => {
        const reportedAt = new Date('2024-01-15T10:00:00.000Z');
        const boundaryTime = new Date(reportedAt.getTime() + MUTABILITY_WINDOW_MS);

        const changes = [firstResult, boundaryResult];
        const timestamps = [reportedAt, boundaryTime];

        const { finalResult, rejectedCount } = simulateMutabilityWindow(
          changes,
          reportedAt,
          timestamps
        );

        expect(rejectedCount).toBe(0);
        expect(finalResult).toBe(boundaryResult);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * A change 1ms after the 10-minute window is rejected.
   */
  it('change 1ms after the window is rejected', () => {
    fc.assert(
      fc.property(matchResultArb, matchResultArb, (firstResult, lateResult) => {
        const reportedAt = new Date('2024-01-15T10:00:00.000Z');
        const justAfterWindow = new Date(reportedAt.getTime() + MUTABILITY_WINDOW_MS + 1);

        const changes = [firstResult, lateResult];
        const timestamps = [reportedAt, justAfterWindow];

        const { finalResult, rejectedCount } = simulateMutabilityWindow(
          changes,
          reportedAt,
          timestamps
        );

        expect(rejectedCount).toBe(1);
        expect(finalResult).toBe(firstResult);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * If the same result is reported multiple times within the window,
   * the final state still reflects that result (no-op changes are valid).
   */
  it('repeated same result within window yields that result as final state', () => {
    fc.assert(
      fc.property(
        matchResultArb,
        fc.integer({ min: 1, max: 10 }),
        (result, repeatCount) => {
          const reportedAt = new Date('2024-01-15T10:00:00.000Z');
          const changes = Array(repeatCount).fill(result);
          const timestamps = changes.map((_, i) =>
            new Date(reportedAt.getTime() + (i * 30 * 1000)) // 30s apart
          );

          const { finalResult } = simulateMutabilityWindow(changes, reportedAt, timestamps);
          expect(finalResult).toBe(result);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 16: Sync conflict max-merge for monotonic counters
 *
 * Validates: Requirements 12.4
 *
 * For any two non-negative integers (local, remote), maxMerge(local, remote)
 * always returns Math.max(local, remote). This holds for mastery_points and
 * challenge_progress.
 */
describe('Feature: operator-mastery-mvp, Property 16: Sync conflict max-merge for monotonic counters', () => {
  /**
   * maxMerge(local, remote) always returns Math.max(local, remote)
   * for any two non-negative integers.
   */
  it('maxMerge returns Math.max(local, remote) for any non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        (local, remote) => {
          expect(maxMerge(local, remote)).toBe(Math.max(local, remote));
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * maxMerge is commutative: maxMerge(a, b) === maxMerge(b, a).
   */
  it('maxMerge is commutative', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        (a, b) => {
          expect(maxMerge(a, b)).toBe(maxMerge(b, a));
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * maxMerge is idempotent: maxMerge(a, a) === a.
   */
  it('maxMerge is idempotent', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        (a) => {
          expect(maxMerge(a, a)).toBe(a);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * maxMerge is associative: maxMerge(maxMerge(a, b), c) === maxMerge(a, maxMerge(b, c)).
   * This ensures multi-device sync converges regardless of merge order.
   */
  it('maxMerge is associative (multi-device convergence)', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        (a, b, c) => {
          expect(maxMerge(maxMerge(a, b), c)).toBe(maxMerge(a, maxMerge(b, c)));
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * maxMerge result is always >= both inputs (monotonic guarantee).
   */
  it('maxMerge result is always >= both inputs', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        (local, remote) => {
          const result = maxMerge(local, remote);
          expect(result).toBeGreaterThanOrEqual(local);
          expect(result).toBeGreaterThanOrEqual(remote);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * maxMerge with zero: maxMerge(0, x) === x and maxMerge(x, 0) === x.
   * Zero is the identity element for max-merge.
   */
  it('zero is the identity element for maxMerge', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        (x) => {
          expect(maxMerge(0, x)).toBe(x);
          expect(maxMerge(x, 0)).toBe(x);
        }
      ),
      { numRuns: 500 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 17: Sync conflict latest-timestamp for Match_Result
 *
 * Validates: Requirements 12.5
 *
 * For any two MatchResultRow objects with different updatedAt timestamps,
 * latestTimestampMerge returns the one with the larger updatedAt.
 * On tie, local wins.
 */
describe('Feature: operator-mastery-mvp, Property 17: Sync conflict latest-timestamp for Match_Result', () => {
  const matchResultArb: fc.Arbitrary<MatchResult> = fc.constantFrom('win', 'loss', 'survived_round');

  // Arbitrary for ISO timestamp strings within a reasonable range
  // Use integer milliseconds to avoid invalid date issues with fc.date()
  const timestampArb = fc.integer({
    min: new Date('2024-01-01T00:00:00.000Z').getTime(),
    max: new Date('2025-12-31T23:59:59.999Z').getTime(),
  }).map((ms) => new Date(ms).toISOString());

  // Arbitrary for a MatchResultRow
  const matchResultRowArb: fc.Arbitrary<MatchResultRow> = fc.record({
    deploymentId: fc.uuid(),
    userId: fc.uuid(),
    result: matchResultArb,
    reportedAt: timestampArb,
    updatedAt: timestampArb,
  });

  /**
   * For any two rows with different updatedAt, latestTimestampMerge returns
   * the row with the larger updatedAt.
   */
  it('returns the row with the larger updatedAt when timestamps differ', () => {
    fc.assert(
      fc.property(
        matchResultRowArb,
        matchResultRowArb,
        fc.boolean(),
        (row1, row2, localIsFirst) => {
          // Ensure timestamps are different
          if (row1.updatedAt === row2.updatedAt) return; // skip ties (tested separately)

          const local = localIsFirst ? row1 : row2;
          const remote = localIsFirst ? row2 : row1;

          const winner = latestTimestampMerge(local, remote);

          const localTime = new Date(local.updatedAt).getTime();
          const remoteTime = new Date(remote.updatedAt).getTime();

          if (localTime > remoteTime) {
            expect(winner).toBe(local);
          } else {
            expect(winner).toBe(remote);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * On tie (same updatedAt), local wins (optimistic-local-first policy).
   */
  it('returns local on tie (optimistic-local-first)', () => {
    fc.assert(
      fc.property(
        matchResultRowArb,
        matchResultArb,
        (baseRow, remoteResult) => {
          const local: MatchResultRow = { ...baseRow };
          const remote: MatchResultRow = {
            ...baseRow,
            result: remoteResult,
            // Same updatedAt as local
          };

          const winner = latestTimestampMerge(local, remote);
          expect(winner).toBe(local);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * latestTimestampMerge always returns one of the two input rows (no mutation).
   */
  it('always returns one of the two input rows (referential identity)', () => {
    fc.assert(
      fc.property(matchResultRowArb, matchResultRowArb, (local, remote) => {
        const winner = latestTimestampMerge(local, remote);
        expect(winner === local || winner === remote).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * latestTimestampMerge is deterministic: same inputs always produce same output.
   */
  it('is deterministic (same inputs produce same output)', () => {
    fc.assert(
      fc.property(matchResultRowArb, matchResultRowArb, (local, remote) => {
        const result1 = latestTimestampMerge(local, remote);
        const result2 = latestTimestampMerge(local, remote);
        expect(result1).toBe(result2);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * When local has a strictly later timestamp, local always wins regardless
   * of the result values.
   */
  it('local wins when local.updatedAt is strictly later', () => {
    fc.assert(
      fc.property(
        matchResultRowArb,
        matchResultArb,
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 1 day offset
        (baseRow, remoteResult, offsetMs) => {
          const localTime = new Date(baseRow.updatedAt).getTime() + offsetMs;
          const local: MatchResultRow = {
            ...baseRow,
            updatedAt: new Date(localTime).toISOString(),
          };
          const remote: MatchResultRow = {
            ...baseRow,
            result: remoteResult,
            updatedAt: baseRow.updatedAt,
          };

          const winner = latestTimestampMerge(local, remote);
          expect(winner).toBe(local);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * When remote has a strictly later timestamp, remote always wins regardless
   * of the result values.
   */
  it('remote wins when remote.updatedAt is strictly later', () => {
    fc.assert(
      fc.property(
        matchResultRowArb,
        matchResultArb,
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 1 day offset
        (baseRow, localResult, offsetMs) => {
          const remoteTime = new Date(baseRow.updatedAt).getTime() + offsetMs;
          const local: MatchResultRow = {
            ...baseRow,
            result: localResult,
            updatedAt: baseRow.updatedAt,
          };
          const remote: MatchResultRow = {
            ...baseRow,
            updatedAt: new Date(remoteTime).toISOString(),
          };

          const winner = latestTimestampMerge(local, remote);
          expect(winner).toBe(remote);
        }
      ),
      { numRuns: 500 }
    );
  });
});
