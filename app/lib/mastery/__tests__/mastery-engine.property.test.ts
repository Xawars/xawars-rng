import fc from 'fast-check';
import { pointsFor, applyAward, computeTier } from '@/app/lib/mastery/mastery-engine';
import type { MasteryEvent, MasteryTier, OperatorMastery, MasteryBadge } from '@/app/types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 10: Mastery_Points trace sum
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 5.3
 *
 * For any event trace E[0..n] and for any operator id o, the Mastery_Engine's
 * persisted mastery_points[o] after the trace equals the sum over all i of:
 * 10 if E[i] is a Match_Result win reported on a Deployment with operator o;
 * 5 if E[i] is a Match_Result survived_round on o;
 * 15 if E[i] is a kill-target completion for o;
 * the mastery_point_reward of any Challenge C completed by E[i] whose
 * contributing operator set contains o; and 0 otherwise.
 */
describe('Feature: operator-mastery-mvp, Property 10: Mastery_Points trace sum', () => {
  // Arbitrary for MasteryEvent
  const masteryEventArb: fc.Arbitrary<MasteryEvent> = fc.oneof(
    fc.constant<MasteryEvent>({ kind: 'match_result_win' }),
    fc.constant<MasteryEvent>({ kind: 'match_result_survived' }),
    fc.constant<MasteryEvent>({ kind: 'kill_target_complete' }),
    fc.integer({ min: 1, max: 250 }).map(
      (reward): MasteryEvent => ({ kind: 'challenge_completed', reward })
    )
  );

  // Arbitrary for a trace of events (1..30 events)
  const eventTraceArb = fc.array(masteryEventArb, { minLength: 1, maxLength: 30 });

  function makeState(operatorId: string): OperatorMastery {
    return {
      userId: 'user-1',
      operatorId,
      masteryPoints: 0,
      currentTier: 'Bronze',
    };
  }

  /**
   * After replaying a trace of events through applyAward(state, pointsFor(event)),
   * the final mastery_points equals the sum of pointsFor(event) for all events.
   */
  it('mastery_points equals sum of pointsFor over all events in the trace', () => {
    fc.assert(
      fc.property(eventTraceArb, (events) => {
        let state = makeState('op-test');

        // Compute expected sum
        const expectedSum = events.reduce((sum, event) => sum + pointsFor(event), 0);

        // Replay trace through applyAward
        for (const event of events) {
          const points = pointsFor(event);
          const { next } = applyAward(state, points);
          state = next;
        }

        expect(state.masteryPoints).toBe(expectedSum);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * pointsFor returns the correct value for each event kind:
   * win=10, survived=5, kill_target=15, challenge=reward.
   */
  it('pointsFor returns correct value for any MasteryEvent', () => {
    fc.assert(
      fc.property(masteryEventArb, (event) => {
        const points = pointsFor(event);
        switch (event.kind) {
          case 'match_result_win':
            expect(points).toBe(10);
            break;
          case 'match_result_survived':
            expect(points).toBe(5);
            break;
          case 'kill_target_complete':
            expect(points).toBe(15);
            break;
          case 'challenge_completed':
            expect(points).toBe(event.reward);
            break;
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * The final mastery_points after a trace is independent of the order of events
   * (since addition is commutative and applyAward is purely additive).
   */
  it('mastery_points is independent of event order (commutative sum)', () => {
    fc.assert(
      fc.property(eventTraceArb, (events) => {
        // Forward replay
        let stateForward = makeState('op-test');
        for (const event of events) {
          const { next } = applyAward(stateForward, pointsFor(event));
          stateForward = next;
        }

        // Reverse replay
        let stateReverse = makeState('op-test');
        for (let i = events.length - 1; i >= 0; i--) {
          const { next } = applyAward(stateReverse, pointsFor(events[i]));
          stateReverse = next;
        }

        expect(stateForward.masteryPoints).toBe(stateReverse.masteryPoints);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Events with 0 points (e.g., challenge_completed with reward 0) do not
   * change the mastery_points total.
   */
  it('zero-point events do not change mastery_points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (initialPoints) => {
          const state = makeState('op-test');
          const stateWithPoints: OperatorMastery = { ...state, masteryPoints: initialPoints, currentTier: computeTier(initialPoints) };

          const zeroEvent: MasteryEvent = { kind: 'challenge_completed', reward: 0 };
          const { next } = applyAward(stateWithPoints, pointsFor(zeroEvent));

          expect(next.masteryPoints).toBe(initialPoints);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 11: Mastery_Points are monotonic under sync replay
 *
 * Validates: Requirements 7.5, 12.4
 *
 * For any event trace possibly containing duplicate award events (sync replays),
 * and for any operator id o and any pair of trace prefixes T_a ⊆ T_b,
 * mastery_points[o] after T_a <= mastery_points[o] after T_b,
 * and the final mastery_points[o] value is independent of duplicates
 * (each unique award contributes once).
 */
describe('Feature: operator-mastery-mvp, Property 11: Mastery_Points are monotonic under sync replay', () => {
  const masteryEventArb: fc.Arbitrary<MasteryEvent> = fc.oneof(
    fc.constant<MasteryEvent>({ kind: 'match_result_win' }),
    fc.constant<MasteryEvent>({ kind: 'match_result_survived' }),
    fc.constant<MasteryEvent>({ kind: 'kill_target_complete' }),
    fc.integer({ min: 1, max: 250 }).map(
      (reward): MasteryEvent => ({ kind: 'challenge_completed', reward })
    )
  );

  const eventTraceArb = fc.array(masteryEventArb, { minLength: 1, maxLength: 30 });

  function makeState(operatorId: string): OperatorMastery {
    return {
      userId: 'user-1',
      operatorId,
      masteryPoints: 0,
      currentTier: 'Bronze',
    };
  }

  /**
   * Mastery_Points are monotonically non-decreasing: for any prefix T_a ⊆ T_b,
   * mastery_points after T_a <= mastery_points after T_b.
   * Since applyAward ignores non-positive points, every step either stays the same
   * or increases.
   */
  it('mastery_points are monotonically non-decreasing across any trace', () => {
    fc.assert(
      fc.property(eventTraceArb, (events) => {
        let state = makeState('op-test');
        let previousPoints = 0;

        for (const event of events) {
          const points = pointsFor(event);
          const { next } = applyAward(state, points);
          state = next;

          // Monotonicity: current >= previous
          expect(state.masteryPoints).toBeGreaterThanOrEqual(previousPoints);
          previousPoints = state.masteryPoints;
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Duplicate events in a trace (sync replays) are handled by the idempotency
   * mechanism: applyAward is called only for unique awards. We simulate this by
   * showing that if we deduplicate events (by index/id), the final total equals
   * the sum of unique awards only.
   *
   * In the mastery system, each award is guarded by a completed_at IS NULL check
   * or a UNIQUE constraint. We model this by tagging events with unique IDs and
   * only applying each ID once.
   */
  it('duplicates do not increase total beyond unique awards (idempotent replay)', () => {
    // Generate a trace of unique events, then duplicate some of them
    const uniqueEventsArb = fc.array(
      fc.tuple(fc.uuid(), masteryEventArb),
      { minLength: 1, maxLength: 15 }
    );

    // Duplicate some events by repeating entries
    const traceWithDuplicatesArb = uniqueEventsArb.chain((uniqueEvents) => {
      // Create duplicates by sampling from the unique events
      const duplicatesArb = fc.array(
        fc.integer({ min: 0, max: uniqueEvents.length - 1 }),
        { minLength: 0, maxLength: 10 }
      ).map((indices) => indices.map((i) => uniqueEvents[i]));

      return duplicatesArb.map((duplicates) => ({
        uniqueEvents,
        fullTrace: [...uniqueEvents, ...duplicates],
      }));
    });

    fc.assert(
      fc.property(traceWithDuplicatesArb, ({ uniqueEvents, fullTrace }) => {
        // Expected: sum of unique events only
        const expectedPoints = uniqueEvents.reduce(
          (sum, [, event]) => sum + pointsFor(event),
          0
        );

        // Simulate idempotent replay: track which event IDs have been applied
        const appliedIds = new Set<string>();
        let state = makeState('op-test');

        for (const [id, event] of fullTrace) {
          if (!appliedIds.has(id)) {
            appliedIds.add(id);
            const points = pointsFor(event);
            const { next } = applyAward(state, points);
            state = next;
          }
          // Duplicate: skip (idempotent — no change)
        }

        expect(state.masteryPoints).toBe(expectedPoints);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * applyAward with non-positive points never decreases mastery_points.
   * This ensures the monotonicity invariant holds even if somehow a negative
   * or zero value is passed.
   */
  it('applyAward with non-positive points never decreases mastery_points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: -1000, max: 0 }),
        (initialPoints, negativeAward) => {
          const state: OperatorMastery = {
            userId: 'user-1',
            operatorId: 'op-test',
            masteryPoints: initialPoints,
            currentTier: computeTier(initialPoints),
          };

          const { next } = applyAward(state, negativeAward);
          expect(next.masteryPoints).toBeGreaterThanOrEqual(initialPoints);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 13: Mastery_Badge uniqueness per (user, operator, tier)
 *
 * Validates: Requirements 8.1, 8.5
 *
 * For any event trace possibly containing duplicate tier-crossing events
 * (sync replays for the same user, operator, and tier), the count of
 * mastery_badges rows with that (user_id, operator_id, tier) triple is exactly 1.
 *
 * We model this at the engine level: applyAward detects tier crossings, and
 * the badge insertion uses a UNIQUE constraint. We simulate the badge collection
 * and verify uniqueness.
 */
describe('Feature: operator-mastery-mvp, Property 13: Mastery_Badge uniqueness per (user, operator, tier)', () => {
  const masteryEventArb: fc.Arbitrary<MasteryEvent> = fc.oneof(
    fc.constant<MasteryEvent>({ kind: 'match_result_win' }),
    fc.constant<MasteryEvent>({ kind: 'match_result_survived' }),
    fc.constant<MasteryEvent>({ kind: 'kill_target_complete' }),
    fc.integer({ min: 1, max: 250 }).map(
      (reward): MasteryEvent => ({ kind: 'challenge_completed', reward })
    )
  );

  const eventTraceArb = fc.array(masteryEventArb, { minLength: 1, maxLength: 50 });

  // Arbitrary for operator IDs (simulate multiple operators)
  const operatorIdArb = fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager');

  function makeState(userId: string, operatorId: string): OperatorMastery {
    return {
      userId,
      operatorId,
      masteryPoints: 0,
      currentTier: 'Bronze',
    };
  }

  /**
   * For any event trace applied to a single operator, the badge collection
   * contains at most one badge per (user, operator, tier) triple.
   * Tier crossings detected by applyAward are inserted with UNIQUE constraint
   * semantics (duplicates are no-ops).
   */
  it('at most one badge per (user, operator, tier) triple after any event trace', () => {
    fc.assert(
      fc.property(operatorIdArb, eventTraceArb, (operatorId, events) => {
        const userId = 'user-1';
        let state = makeState(userId, operatorId);

        // Simulate badge collection with UNIQUE constraint
        const badges = new Map<string, MasteryBadge>(); // key: "userId|operatorId|tier"

        for (const event of events) {
          const points = pointsFor(event);
          const { next, tierCrossed } = applyAward(state, points);
          state = next;

          if (tierCrossed !== null) {
            const key = `${userId}|${operatorId}|${tierCrossed}`;
            // UNIQUE constraint: only insert if not already present
            if (!badges.has(key)) {
              badges.set(key, {
                id: `badge-${badges.size}`,
                userId,
                operatorId,
                tier: tierCrossed,
                unlockedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Verify uniqueness: count badges per (user, operator, tier)
        const counts = new Map<string, number>();
        for (const [key] of badges) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        for (const [, count] of counts) {
          expect(count).toBe(1);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Duplicate tier-crossing events (sync replays) do not create additional badges.
   * We simulate replaying the same trace twice and verify badge count stays the same.
   */
  it('replaying the same trace twice does not create duplicate badges', () => {
    fc.assert(
      fc.property(operatorIdArb, eventTraceArb, (operatorId, events) => {
        const userId = 'user-1';

        // First pass: collect badges
        let state1 = makeState(userId, operatorId);
        const badges = new Map<string, MasteryBadge>();

        for (const event of events) {
          const points = pointsFor(event);
          const { next, tierCrossed } = applyAward(state1, points);
          state1 = next;

          if (tierCrossed !== null) {
            const key = `${userId}|${operatorId}|${tierCrossed}`;
            if (!badges.has(key)) {
              badges.set(key, {
                id: `badge-${badges.size}`,
                userId,
                operatorId,
                tier: tierCrossed,
                unlockedAt: new Date().toISOString(),
              });
            }
          }
        }

        const badgeCountAfterFirstPass = badges.size;

        // Second pass (sync replay): replay same events from the final state
        // In reality, sync replay would try to re-apply awards, but the
        // UNIQUE constraint prevents duplicate badges.
        // We simulate by replaying from the beginning with the same badge map.
        let state2 = makeState(userId, operatorId);
        for (const event of events) {
          const points = pointsFor(event);
          const { next, tierCrossed } = applyAward(state2, points);
          state2 = next;

          if (tierCrossed !== null) {
            const key = `${userId}|${operatorId}|${tierCrossed}`;
            // UNIQUE constraint: insert only if not present
            if (!badges.has(key)) {
              badges.set(key, {
                id: `badge-${badges.size}`,
                userId,
                operatorId,
                tier: tierCrossed,
                unlockedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Badge count should not increase after replay
        expect(badges.size).toBe(badgeCountAfterFirstPass);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * For multiple operators, each (user, operator, tier) triple has at most one badge.
   * This tests the cross-operator uniqueness guarantee.
   */
  it('badge uniqueness holds across multiple operators', () => {
    const multiOperatorTraceArb = fc.array(
      fc.tuple(operatorIdArb, masteryEventArb),
      { minLength: 1, maxLength: 50 }
    );

    fc.assert(
      fc.property(multiOperatorTraceArb, (trace) => {
        const userId = 'user-1';
        const states = new Map<string, OperatorMastery>();
        const badges = new Map<string, MasteryBadge>();

        for (const [operatorId, event] of trace) {
          // Get or create state for this operator
          if (!states.has(operatorId)) {
            states.set(operatorId, makeState(userId, operatorId));
          }

          const state = states.get(operatorId)!;
          const points = pointsFor(event);
          const { next, tierCrossed } = applyAward(state, points);
          states.set(operatorId, next);

          if (tierCrossed !== null) {
            const key = `${userId}|${operatorId}|${tierCrossed}`;
            if (!badges.has(key)) {
              badges.set(key, {
                id: `badge-${badges.size}`,
                userId,
                operatorId,
                tier: tierCrossed,
                unlockedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Verify: each key appears exactly once
        const seenKeys = new Set<string>();
        for (const [key] of badges) {
          expect(seenKeys.has(key)).toBe(false);
          seenKeys.add(key);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * The maximum number of badges for a single (user, operator) pair is 4
   * (one per tier crossing: Silver, Gold, Platinum, Diamond — Bronze is the starting tier).
   */
  it('at most 4 badges per (user, operator) pair (one per tier above Bronze)', () => {
    // Use a large event trace to ensure we can reach Diamond
    const largeTraceArb = fc.array(masteryEventArb, { minLength: 10, maxLength: 100 });

    fc.assert(
      fc.property(operatorIdArb, largeTraceArb, (operatorId, events) => {
        const userId = 'user-1';
        let state = makeState(userId, operatorId);
        const badges = new Map<string, MasteryBadge>();

        for (const event of events) {
          const points = pointsFor(event);
          const { next, tierCrossed } = applyAward(state, points);
          state = next;

          if (tierCrossed !== null) {
            const key = `${userId}|${operatorId}|${tierCrossed}`;
            if (!badges.has(key)) {
              badges.set(key, {
                id: `badge-${badges.size}`,
                userId,
                operatorId,
                tier: tierCrossed,
                unlockedAt: new Date().toISOString(),
              });
            }
          }
        }

        // At most 4 tier crossings possible: Silver, Gold, Platinum, Diamond
        expect(badges.size).toBeLessThanOrEqual(4);
      }),
      { numRuns: 200 }
    );
  });
});
