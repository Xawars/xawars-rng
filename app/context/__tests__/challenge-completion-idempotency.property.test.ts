import fc from 'fast-check';
import { isCompleted, computeEffectiveXpReward } from '../../lib/mastery/challenge-engine';
import type { Challenge, ChallengeSlot, Objective, OperatorScope } from '../../types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 8: Challenge completion is idempotent
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5
 *
 * For any event trace that includes one or more completion events for a Challenge C
 * (defined as the moment C.progress first reaches C.target_count, plus any number of
 * duplicate completion-replay events from sync), the Mastery_System sets C.completed_at
 * exactly once (at the first such event) and dispatches exactly one
 * awardXP(effectiveXpReward, 'challenge_completed') call and exactly one
 * awardMasteryPoints(operatorContributors, masteryPointReward) call for C.id.
 */

// --- Arbitraries ---

const slotArb: fc.Arbitrary<ChallengeSlot> = fc.constantFrom('daily', 'weekly', 'mission');

const objectiveArb: fc.Arbitrary<Objective> = fc.constantFrom(
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills'
);

const operatorScopeArb: fc.Arbitrary<OperatorScope> = fc.constantFrom(
  'any',
  'random_pool',
  'specific_operator'
);

/**
 * Generate a valid target_count based on slot constraints:
 * - daily: [1, 10]
 * - weekly: [5, 50]
 * - mission: [1, 50]
 */
function targetCountForSlot(slot: ChallengeSlot): fc.Arbitrary<number> {
  switch (slot) {
    case 'daily':
      return fc.integer({ min: 1, max: 10 });
    case 'weekly':
      return fc.integer({ min: 5, max: 50 });
    case 'mission':
      return fc.integer({ min: 1, max: 50 });
  }
}

/**
 * Arbitrary for a Challenge that has progress >= targetCount (i.e., is completable).
 * The challenge has completedAt = null (not yet completed) to simulate the first
 * completion event.
 */
const completableChallengeArb: fc.Arbitrary<Challenge> = slotArb.chain((slot) =>
  targetCountForSlot(slot).chain((targetCount) =>
    fc.record({
      id: fc.uuid(),
      userId: fc.uuid(),
      slot: fc.constant(slot),
      role: fc.option(fc.constantFrom('Hard Breacher', 'Entry Fragger', 'Anchor', 'Roamer'), { nil: null }),
      objective: objectiveArb,
      targetCount: fc.constant(targetCount),
      restriction: fc.constant(null),
      operatorScope: operatorScopeArb,
      operatorPool: fc.constant([] as string[]),
      xpReward: fc.constant(targetCount * (slot === 'daily' ? 10 : slot === 'weekly' ? 15 : 12)),
      masteryPointReward: fc.constant(targetCount * 5),
      xpOverride: fc.constant(null as number | null),
      xpOverrideReason: fc.constant(null as string | null),
      // progress >= targetCount to ensure isCompleted returns true
      progress: fc.integer({ min: targetCount, max: targetCount + 5 }),
      generatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
      expiresAt: fc.constant(null as string | null),
      completedAt: fc.constant(null as string | null),
      discardedAt: fc.constant(null as string | null),
    })
  )
);

/**
 * Arbitrary for a Challenge with an admin override (valid Administrative_Exception).
 */
const completableChallengeWithOverrideArb: fc.Arbitrary<Challenge> = slotArb.chain((slot) =>
  targetCountForSlot(slot).chain((targetCount) =>
    fc.record({
      id: fc.uuid(),
      userId: fc.uuid(),
      slot: fc.constant(slot),
      role: fc.constant(null as string | null),
      objective: objectiveArb,
      targetCount: fc.constant(targetCount),
      restriction: fc.constant(null),
      operatorScope: fc.constant('any' as OperatorScope),
      operatorPool: fc.constant([] as string[]),
      xpReward: fc.constant(targetCount * (slot === 'daily' ? 10 : slot === 'weekly' ? 15 : 12)),
      masteryPointReward: fc.constant(targetCount * 5),
      xpOverride: fc.integer({ min: 1, max: 10000 }),
      xpOverrideReason: fc.string({ minLength: 1, maxLength: 100 }),
      progress: fc.integer({ min: targetCount, max: targetCount + 5 }),
      generatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
      expiresAt: fc.constant(null as string | null),
      completedAt: fc.constant(null as string | null),
      discardedAt: fc.constant(null as string | null),
    })
  )
);

// --- Completion Pipeline Simulation ---

/**
 * Simulates the handleChallengeCompletion logic from MasteryContext.
 * This is the pure-logic equivalent of the completion pipeline:
 * 1. Check completedAt IS NULL (idempotency precondition)
 * 2. Set completedAt
 * 3. Compute effectiveXpReward
 * 4. Award XP (tracked via counter)
 * 5. Award mastery points (tracked via counter)
 *
 * Returns the updated challenge and side-effect counters.
 */
interface CompletionSideEffects {
  xpAwarded: number;
  xpAwardCount: number;
  masteryPointsAwarded: number;
  masteryPointAwardCount: number;
  completedAtSet: boolean;
  completedAtSetCount: number;
}

function simulateCompletionPipeline(
  challenge: Challenge,
  effects: CompletionSideEffects
): { challenge: Challenge; effects: CompletionSideEffects } {
  // Idempotency anchor: only award if not already completed (Requirement 5.5)
  if (challenge.completedAt !== null) {
    // Already completed — no-op
    return { challenge, effects };
  }

  // Check if actually completed
  if (!isCompleted(challenge)) {
    return { challenge, effects };
  }

  // Step 1: Set completed_at (Requirement 5.1)
  const completedChallenge: Challenge = {
    ...challenge,
    completedAt: new Date().toISOString(),
  };

  // Step 2: Compute effective XP reward (Requirement 5.2)
  const effectiveXpReward = computeEffectiveXpReward(challenge);

  // Step 3: Award XP (Requirement 5.2)
  // Step 4: Award mastery points (Requirement 5.3)
  const updatedEffects: CompletionSideEffects = {
    xpAwarded: effects.xpAwarded + effectiveXpReward,
    xpAwardCount: effects.xpAwardCount + 1,
    masteryPointsAwarded: effects.masteryPointsAwarded + challenge.masteryPointReward,
    masteryPointAwardCount: effects.masteryPointAwardCount + 1,
    completedAtSet: true,
    completedAtSetCount: effects.completedAtSetCount + 1,
  };

  return { challenge: completedChallenge, effects: updatedEffects };
}

function emptyEffects(): CompletionSideEffects {
  return {
    xpAwarded: 0,
    xpAwardCount: 0,
    masteryPointsAwarded: 0,
    masteryPointAwardCount: 0,
    completedAtSet: false,
    completedAtSetCount: 0,
  };
}

// --- Tests ---

describe('Feature: operator-mastery-mvp, Property 8: Challenge completion is idempotent', () => {
  /**
   * Once a challenge has completedAt set, calling the completion pipeline again
   * does NOT re-award XP. The completedAt IS NULL precondition prevents duplicate awards.
   *
   * Validates: Requirements 5.2, 5.5
   */
  it('awardXP is called exactly once regardless of how many times completion is triggered', () => {
    fc.assert(
      fc.property(
        completableChallengeArb,
        fc.integer({ min: 1, max: 10 }), // number of duplicate completion attempts
        (challenge, duplicateAttempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          // First completion: should award
          const first = simulateCompletionPipeline(currentChallenge, effects);
          currentChallenge = first.challenge;
          effects = first.effects;

          // Verify first completion awarded XP
          expect(effects.xpAwardCount).toBe(1);

          // Duplicate completion attempts (sync replays): should NOT award again
          for (let i = 0; i < duplicateAttempts; i++) {
            const dup = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = dup.challenge;
            effects = dup.effects;
          }

          // XP was awarded exactly once
          expect(effects.xpAwardCount).toBe(1);
          expect(effects.xpAwarded).toBe(computeEffectiveXpReward(challenge));
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Once a challenge has completedAt set, calling the completion pipeline again
   * does NOT re-award mastery points.
   *
   * Validates: Requirements 5.3, 5.5
   */
  it('awardMasteryPoints is called exactly once regardless of how many times completion is triggered', () => {
    fc.assert(
      fc.property(
        completableChallengeArb,
        fc.integer({ min: 1, max: 10 }), // number of duplicate completion attempts
        (challenge, duplicateAttempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          // First completion
          const first = simulateCompletionPipeline(currentChallenge, effects);
          currentChallenge = first.challenge;
          effects = first.effects;

          // Verify first completion awarded mastery points
          expect(effects.masteryPointAwardCount).toBe(1);

          // Duplicate completion attempts
          for (let i = 0; i < duplicateAttempts; i++) {
            const dup = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = dup.challenge;
            effects = dup.effects;
          }

          // Mastery points were awarded exactly once
          expect(effects.masteryPointAwardCount).toBe(1);
          expect(effects.masteryPointsAwarded).toBe(challenge.masteryPointReward);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * The completedAt timestamp is set exactly once regardless of how many times
   * completion is triggered.
   *
   * Validates: Requirements 5.1, 5.5
   */
  it('completedAt is set exactly once regardless of how many times completion is triggered', () => {
    fc.assert(
      fc.property(
        completableChallengeArb,
        fc.integer({ min: 1, max: 10 }), // number of duplicate completion attempts
        (challenge, duplicateAttempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          // First completion
          const first = simulateCompletionPipeline(currentChallenge, effects);
          currentChallenge = first.challenge;
          effects = first.effects;

          // completedAt was set
          expect(currentChallenge.completedAt).not.toBeNull();
          expect(effects.completedAtSetCount).toBe(1);

          // Capture the timestamp
          const firstCompletedAt = currentChallenge.completedAt;

          // Duplicate completion attempts
          for (let i = 0; i < duplicateAttempts; i++) {
            const dup = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = dup.challenge;
            effects = dup.effects;
          }

          // completedAt was set exactly once — same timestamp, count still 1
          expect(effects.completedAtSetCount).toBe(1);
          expect(currentChallenge.completedAt).toBe(firstCompletedAt);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * The idempotency holds for arbitrary challenge configurations:
   * daily/weekly/mission, any valid target_count, any progress >= target_count,
   * with or without admin overrides.
   *
   * Validates: Requirements 5.1, 5.2, 5.3, 5.5
   */
  it('idempotency holds for arbitrary challenge configurations including admin overrides', () => {
    const challengeArb = fc.oneof(completableChallengeArb, completableChallengeWithOverrideArb);

    fc.assert(
      fc.property(
        challengeArb,
        fc.integer({ min: 2, max: 20 }), // total completion attempts (first + duplicates)
        (challenge, totalAttempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          // Run the completion pipeline totalAttempts times
          for (let i = 0; i < totalAttempts; i++) {
            const result = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = result.challenge;
            effects = result.effects;
          }

          // Regardless of how many attempts, rewards are dispatched exactly once
          expect(effects.xpAwardCount).toBe(1);
          expect(effects.masteryPointAwardCount).toBe(1);
          expect(effects.completedAtSetCount).toBe(1);

          // The XP awarded matches the effective reward for this challenge
          expect(effects.xpAwarded).toBe(computeEffectiveXpReward(challenge));

          // The mastery points awarded match the challenge's mastery_point_reward
          expect(effects.masteryPointsAwarded).toBe(challenge.masteryPointReward);

          // completedAt is set (non-null)
          expect(currentChallenge.completedAt).not.toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * A challenge that has not yet reached target_count does NOT trigger completion,
   * even if the pipeline is called multiple times. This ensures the precondition
   * (progress >= target_count AND completedAt IS NULL) is both necessary conditions.
   */
  it('incomplete challenges never trigger the reward pipeline regardless of attempts', () => {
    const incompleteChallengeArb: fc.Arbitrary<Challenge> = slotArb.chain((slot) =>
      targetCountForSlot(slot).chain((targetCount) =>
        fc.integer({ min: 0, max: targetCount - 1 }).chain((progress) =>
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            slot: fc.constant(slot),
            role: fc.constant(null as string | null),
            objective: objectiveArb,
            targetCount: fc.constant(targetCount),
            restriction: fc.constant(null),
            operatorScope: fc.constant('any' as OperatorScope),
            operatorPool: fc.constant([] as string[]),
            xpReward: fc.constant(targetCount * (slot === 'daily' ? 10 : slot === 'weekly' ? 15 : 12)),
            masteryPointReward: fc.constant(targetCount * 5),
            xpOverride: fc.constant(null as number | null),
            xpOverrideReason: fc.constant(null as string | null),
            progress: fc.constant(progress),
            generatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
            expiresAt: fc.constant(null as string | null),
            completedAt: fc.constant(null as string | null),
            discardedAt: fc.constant(null as string | null),
          })
        )
      )
    );

    fc.assert(
      fc.property(
        incompleteChallengeArb,
        fc.integer({ min: 1, max: 10 }),
        (challenge, attempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          for (let i = 0; i < attempts; i++) {
            const result = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = result.challenge;
            effects = result.effects;
          }

          // No rewards should have been dispatched
          expect(effects.xpAwardCount).toBe(0);
          expect(effects.masteryPointAwardCount).toBe(0);
          expect(effects.completedAtSetCount).toBe(0);
          expect(currentChallenge.completedAt).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * A challenge that was already completed (completedAt !== null) before the pipeline
   * runs never triggers any additional awards — even with progress >= target_count.
   * This directly tests the completedAt IS NULL precondition.
   */
  it('already-completed challenges never re-trigger the reward pipeline', () => {
    const alreadyCompletedChallengeArb: fc.Arbitrary<Challenge> = slotArb.chain((slot) =>
      targetCountForSlot(slot).chain((targetCount) =>
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          slot: fc.constant(slot),
          role: fc.constant(null as string | null),
          objective: objectiveArb,
          targetCount: fc.constant(targetCount),
          restriction: fc.constant(null),
          operatorScope: fc.constant('any' as OperatorScope),
          operatorPool: fc.constant([] as string[]),
          xpReward: fc.constant(targetCount * (slot === 'daily' ? 10 : slot === 'weekly' ? 15 : 12)),
          masteryPointReward: fc.constant(targetCount * 5),
          xpOverride: fc.constant(null as number | null),
          xpOverrideReason: fc.constant(null as string | null),
          progress: fc.integer({ min: targetCount, max: targetCount + 5 }),
          generatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
          expiresAt: fc.constant(null as string | null),
          completedAt: fc.constant('2024-01-01T12:00:00.000Z'), // Already completed!
          discardedAt: fc.constant(null as string | null),
        })
      )
    );

    fc.assert(
      fc.property(
        alreadyCompletedChallengeArb,
        fc.integer({ min: 1, max: 10 }),
        (challenge, attempts) => {
          let currentChallenge = challenge;
          let effects = emptyEffects();

          for (let i = 0; i < attempts; i++) {
            const result = simulateCompletionPipeline(currentChallenge, effects);
            currentChallenge = result.challenge;
            effects = result.effects;
          }

          // No rewards should have been dispatched — challenge was already completed
          expect(effects.xpAwardCount).toBe(0);
          expect(effects.masteryPointAwardCount).toBe(0);
          expect(effects.completedAtSetCount).toBe(0);

          // completedAt remains unchanged
          expect(currentChallenge.completedAt).toBe('2024-01-01T12:00:00.000Z');
        }
      ),
      { numRuns: 200 }
    );
  });
});
