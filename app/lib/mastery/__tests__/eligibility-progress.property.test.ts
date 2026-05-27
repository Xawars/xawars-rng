import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  evaluateEligibility,
  applyDeploymentProgress,
  applyMatchResultProgress,
  applyKillIncrement,
} from '@/app/lib/mastery/challenge-engine';
import { operators } from '@/app/data/operators';
import type { DeploymentRecord } from '@/app/types/database';
import type {
  Challenge,
  ChallengeSlot,
  Objective,
  OperatorScope,
  MatchResult,
  Restriction,
  RestrictionKind,
} from '@/app/types/mastery';

// --- Shared Arbitraries ---

const operatorIds = operators.map((op) => op.id);

/** All unique roles across the operator catalog. */
const ALL_ROLES: string[] = Array.from(
  new Set(operators.flatMap((op) => op.roles))
);

/** All unique gadgets across the operator catalog. */
const ALL_GADGETS: string[] = Array.from(
  new Set(operators.flatMap((op) => op.gadgets))
);

/** All unique weapons (primaries + secondaries) across the operator catalog. */
const ALL_WEAPONS: string[] = Array.from(
  new Set(operators.flatMap((op) => [...op.primaries, ...op.secondaries]))
);

/** Arbitrary for a valid operator id from the catalog. */
const operatorIdArb = fc.constantFrom(...operatorIds);

/** Arbitrary for a valid role from the catalog. */
const roleArb = fc.constantFrom(...ALL_ROLES);

/** Arbitrary for a valid gadget from the catalog. */
const gadgetArb = fc.constantFrom(...ALL_GADGETS);

/** Arbitrary for a valid weapon from the catalog. */
const weaponArb = fc.constantFrom(...ALL_WEAPONS);

/** Arbitrary for a challenge slot. */
const slotArb = fc.constantFrom<ChallengeSlot>('daily', 'weekly', 'mission');

/** Arbitrary for an objective. */
const objectiveArb = fc.constantFrom<Objective>(
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills'
);

/** Arbitrary for an operator scope. */
const operatorScopeArb = fc.constantFrom<OperatorScope>(
  'any',
  'random_pool',
  'specific_operator'
);

/** Arbitrary for a match result. */
const matchResultArb = fc.constantFrom<MatchResult>('win', 'loss', 'survived_round');

/** Arbitrary for a restriction kind. */
const restrictionKindArb = fc.constantFrom<RestrictionKind>(
  'gadget_only',
  'playstyle',
  'loadout_limit'
);

/**
 * Generate a DeploymentRecord with realistic values from the operator catalog.
 * Picks a random operator and builds a loadout from that operator's actual equipment.
 */
const deploymentRecordArb: fc.Arbitrary<DeploymentRecord> = operatorIdArb.chain(
  (opId) => {
    const op = operators.find((o) => o.id === opId)!;
    return fc.record({
      id: fc.uuid(),
      operatorId: fc.constant(opId),
      operatorName: fc.constant(op.name),
      operatorSide: fc.constant(op.side as 'attacker' | 'defender'),
      loadout: fc.record({
        primary: fc.constantFrom(...op.primaries),
        secondary: fc.constantFrom(...op.secondaries),
        gadget: fc.constantFrom(...op.gadgets),
      }),
      matchType: fc.constantFrom('Ranked' as const, 'Unranked' as const, 'Quick Match' as const, 'Deathmatch' as const),
      platform: fc.constantFrom('PC' as const, 'Console' as const),
      targetKills: fc.integer({ min: 1, max: 20 }),
      role: fc.constantFrom(...op.roles),
      deployedAt: fc.constant(new Date().toISOString()),
    });
  }
);

/**
 * Generate a restriction that uses values from the operator catalog.
 */
const restrictionArb: fc.Arbitrary<Restriction> = restrictionKindArb.chain(
  (kind) => {
    switch (kind) {
      case 'gadget_only':
        return gadgetArb.map((value) => ({ kind, value }));
      case 'playstyle':
        return roleArb.map((value) => ({ kind, value }));
      case 'loadout_limit':
        return weaponArb.map((value) => ({ kind, value }));
    }
  }
);

/** Arbitrary for restriction or null. */
const optionalRestrictionArb: fc.Arbitrary<Restriction | null> = fc.oneof(
  fc.constant(null),
  restrictionArb
);

/**
 * Generate a Challenge with consistent internal state.
 * The operator pool is generated based on the operator scope.
 */
const challengeArb: fc.Arbitrary<Challenge> = fc
  .record({
    id: fc.uuid(),
    userId: fc.uuid(),
    slot: slotArb,
    role: fc.oneof(fc.constant(null), roleArb),
    objective: objectiveArb,
    targetCount: fc.integer({ min: 1, max: 50 }),
    restriction: optionalRestrictionArb,
    operatorScope: operatorScopeArb,
  })
  .chain((base) => {
    // Generate operator pool based on scope
    const poolArb = (() => {
      switch (base.operatorScope) {
        case 'any':
          return fc.constant([] as string[]);
        case 'random_pool':
          return fc
            .shuffledSubarray(operatorIds, { minLength: 1, maxLength: 5 })
            .map((arr) => [...arr]);
        case 'specific_operator':
          return operatorIdArb.map((id) => [id]);
      }
    })();

    return poolArb.chain((operatorPool) =>
      fc.integer({ min: 0, max: base.targetCount }).map((progress) => ({
        ...base,
        operatorPool,
        xpReward: base.targetCount * 10,
        masteryPointReward: base.targetCount * 5,
        xpOverride: null,
        xpOverrideReason: null,
        progress,
        generatedAt: new Date().toISOString(),
        expiresAt: null,
        completedAt: null,
        discardedAt: null,
      }))
    );
  });

// ============================================================================
// Property 6: Eligibility classification correctness
// ============================================================================

/**
 * Feature: operator-mastery-mvp, Property 6: Eligibility classification correctness
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * For any deployment and any challenge:
 * - fullyEligible is true if and only if operatorScopeOk && roleOk && restrictionOk
 * - Operator scope rules are correctly applied per scope type
 * - Role rules are correctly applied (null role = always ok)
 * - Restriction rules are correctly applied per restriction kind
 */
describe('Feature: operator-mastery-mvp, Property 6: Eligibility classification correctness', () => {
  it('fullyEligible is true iff all three sub-checks pass', () => {
    fc.assert(
      fc.property(deploymentRecordArb, challengeArb, (deployment, challenge) => {
        const eligibility = evaluateEligibility(deployment, challenge);

        // Core invariant: fullyEligible === (operatorScopeOk && roleOk && restrictionOk)
        expect(eligibility.fullyEligible).toBe(
          eligibility.operatorScopeOk && eligibility.roleOk && eligibility.restrictionOk
        );
      }),
      { numRuns: 500 }
    );
  });

  it('operator_scope "any" always yields operatorScopeOk = true', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter((c) => c.operatorScope === 'any'),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          expect(eligibility.operatorScopeOk).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('operator_scope "random_pool" yields operatorScopeOk iff operator is in pool', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter(
          (c) => c.operatorScope === 'random_pool' && c.operatorPool.length > 0
        ),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          const expectedOk = challenge.operatorPool.includes(deployment.operatorId);
          expect(eligibility.operatorScopeOk).toBe(expectedOk);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('operator_scope "specific_operator" yields operatorScopeOk iff operator equals pool single entry', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter(
          (c) => c.operatorScope === 'specific_operator' && c.operatorPool.length === 1
        ),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          const expectedOk = deployment.operatorId === challenge.operatorPool[0];
          expect(eligibility.operatorScopeOk).toBe(expectedOk);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('challenge with null role always yields roleOk = true', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter((c) => c.role === null),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          expect(eligibility.roleOk).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('challenge with a role yields roleOk iff deployment role matches', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter((c) => c.role !== null),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          const expectedOk = deployment.role === challenge.role;
          expect(eligibility.roleOk).toBe(expectedOk);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('challenge with no restriction always yields restrictionOk = true', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter((c) => c.restriction === null),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          expect(eligibility.restrictionOk).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('gadget_only restriction yields restrictionOk iff deployment gadget matches', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter(
          (c) => c.restriction !== null && c.restriction.kind === 'gadget_only'
        ),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          const expectedOk =
            deployment.loadout.gadget === challenge.restriction!.value;
          expect(eligibility.restrictionOk).toBe(expectedOk);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('loadout_limit restriction yields restrictionOk iff deployment primary or secondary matches', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        challengeArb.filter(
          (c) => c.restriction !== null && c.restriction.kind === 'loadout_limit'
        ),
        (deployment, challenge) => {
          const eligibility = evaluateEligibility(deployment, challenge);
          const expectedOk =
            deployment.loadout.primary === challenge.restriction!.value ||
            deployment.loadout.secondary === challenge.restriction!.value;
          expect(eligibility.restrictionOk).toBe(expectedOk);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ============================================================================
// Property 7: Challenge_Progress evolution
// ============================================================================

/**
 * Feature: operator-mastery-mvp, Property 7: Challenge_Progress evolution
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 *
 * For any sequence of progress-applying events:
 * - Progress is always in [0, target_count]
 * - applyDeploymentProgress increments by 1 for eligible deployments with
 *   'complete_deployments' objective (capped at target_count)
 * - applyMatchResultProgress increments by 1 for eligible deployments with
 *   'win_rounds'/'survive_rounds' objective when result matches
 * - applyKillIncrement with delta +1 increments progress (capped at target_count)
 * - applyKillIncrement with delta -1 decrements progress (never below 0),
 *   only for 'get_kills' objective
 * - Progress never exceeds target_count
 * - Progress never goes below 0
 */
describe('Feature: operator-mastery-mvp, Property 7: Challenge_Progress evolution', () => {
  /**
   * Helper: create a challenge that is guaranteed eligible for the given deployment.
   * Sets operator_scope to 'any', role to null, restriction to null.
   */
  function makeEligibleChallenge(
    objective: Objective,
    targetCount: number,
    progress: number
  ): Challenge {
    return {
      id: 'test-challenge-id',
      userId: 'test-user-id',
      slot: 'daily',
      role: null,
      objective,
      targetCount,
      restriction: null,
      operatorScope: 'any',
      operatorPool: [],
      xpReward: targetCount * 10,
      masteryPointReward: targetCount * 5,
      xpOverride: null,
      xpOverrideReason: null,
      progress,
      generatedAt: new Date().toISOString(),
      expiresAt: null,
      completedAt: null,
      discardedAt: null,
    };
  }

  it('applyDeploymentProgress increments by 1 for eligible complete_deployments, capped at target_count', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge('complete_deployments', targetCount, progress);

          const result = applyDeploymentProgress(deployment, challenge);

          // Progress should increment by 1, capped at target_count
          const expectedProgress = Math.min(targetCount, progress + 1);
          expect(result.progress).toBe(expectedProgress);

          // Invariant: progress in [0, target_count]
          expect(result.progress).toBeGreaterThanOrEqual(0);
          expect(result.progress).toBeLessThanOrEqual(result.targetCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('applyDeploymentProgress does not change progress for non-complete_deployments objectives', () => {
    const nonDeploymentObjectiveArb = fc.constantFrom<Objective>(
      'win_rounds',
      'survive_rounds',
      'get_kills'
    );

    fc.assert(
      fc.property(
        deploymentRecordArb,
        nonDeploymentObjectiveArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, objective, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge(objective, targetCount, progress);

          const result = applyDeploymentProgress(deployment, challenge);

          // Progress should not change
          expect(result.progress).toBe(progress);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('applyDeploymentProgress does not change progress for ineligible deployments', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          // Make challenge ineligible by setting specific_operator to a different operator
          const differentOp = operatorIds.find((id) => id !== deployment.operatorId) || 'nonexistent';
          const challenge: Challenge = {
            ...makeEligibleChallenge('complete_deployments', targetCount, progress),
            operatorScope: 'specific_operator',
            operatorPool: [differentOp],
          };

          const result = applyDeploymentProgress(deployment, challenge);

          // Progress should not change for ineligible deployment
          expect(result.progress).toBe(progress);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('applyMatchResultProgress increments by 1 for win_rounds + win result when eligible', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge('win_rounds', targetCount, progress);

          const result = applyMatchResultProgress(deployment, 'win', challenge);

          const expectedProgress = Math.min(targetCount, progress + 1);
          expect(result.progress).toBe(expectedProgress);

          // Invariant: progress in [0, target_count]
          expect(result.progress).toBeGreaterThanOrEqual(0);
          expect(result.progress).toBeLessThanOrEqual(result.targetCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('applyMatchResultProgress increments by 1 for survive_rounds + survived_round result when eligible', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge('survive_rounds', targetCount, progress);

          const result = applyMatchResultProgress(deployment, 'survived_round', challenge);

          const expectedProgress = Math.min(targetCount, progress + 1);
          expect(result.progress).toBe(expectedProgress);

          // Invariant: progress in [0, target_count]
          expect(result.progress).toBeGreaterThanOrEqual(0);
          expect(result.progress).toBeLessThanOrEqual(result.targetCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('applyMatchResultProgress does not increment for mismatched objective/result pairs', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);

          // win_rounds + loss => no increment
          const challengeWin = makeEligibleChallenge('win_rounds', targetCount, progress);
          expect(applyMatchResultProgress(deployment, 'loss', challengeWin).progress).toBe(progress);
          expect(applyMatchResultProgress(deployment, 'survived_round', challengeWin).progress).toBe(progress);

          // survive_rounds + win => no increment
          const challengeSurvive = makeEligibleChallenge('survive_rounds', targetCount, progress);
          expect(applyMatchResultProgress(deployment, 'win', challengeSurvive).progress).toBe(progress);
          expect(applyMatchResultProgress(deployment, 'loss', challengeSurvive).progress).toBe(progress);

          // complete_deployments + any result => no increment
          const challengeDeploy = makeEligibleChallenge('complete_deployments', targetCount, progress);
          expect(applyMatchResultProgress(deployment, 'win', challengeDeploy).progress).toBe(progress);

          // get_kills + any result => no increment
          const challengeKills = makeEligibleChallenge('get_kills', targetCount, progress);
          expect(applyMatchResultProgress(deployment, 'win', challengeKills).progress).toBe(progress);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('applyKillIncrement with delta +1 increments progress, capped at target_count', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge('get_kills', targetCount, progress);

          const result = applyKillIncrement(deployment, challenge, 1);

          const expectedProgress = Math.min(targetCount, progress + 1);
          expect(result.progress).toBe(expectedProgress);

          // Invariant: progress in [0, target_count]
          expect(result.progress).toBeGreaterThanOrEqual(0);
          expect(result.progress).toBeLessThanOrEqual(result.targetCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('applyKillIncrement with delta -1 decrements progress, never below 0', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        (deployment, targetCount, rawProgress) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge('get_kills', targetCount, progress);

          const result = applyKillIncrement(deployment, challenge, -1);

          const expectedProgress = Math.max(0, progress - 1);
          expect(result.progress).toBe(expectedProgress);

          // Invariant: progress in [0, target_count]
          expect(result.progress).toBeGreaterThanOrEqual(0);
          expect(result.progress).toBeLessThanOrEqual(result.targetCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('applyKillIncrement does not change progress for non-get_kills objectives', () => {
    const nonKillObjectiveArb = fc.constantFrom<Objective>(
      'complete_deployments',
      'win_rounds',
      'survive_rounds'
    );

    fc.assert(
      fc.property(
        deploymentRecordArb,
        nonKillObjectiveArb,
        fc.integer({ min: 1, max: 50 }),
        fc.nat({ max: 50 }),
        fc.constantFrom(1 as const, -1 as const),
        (deployment, objective, targetCount, rawProgress, delta) => {
          const progress = Math.min(rawProgress, targetCount);
          const challenge = makeEligibleChallenge(objective, targetCount, progress);

          const result = applyKillIncrement(deployment, challenge, delta);

          // Progress should not change for non-get_kills objectives
          expect(result.progress).toBe(progress);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('progress never exceeds target_count after any sequence of increments', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.constantFrom('deploy', 'kill'), { minLength: 1, maxLength: 60 }),
        (deployment, targetCount, events) => {
          let challenge = makeEligibleChallenge('get_kills', targetCount, 0);

          // For 'deploy' events, use complete_deployments objective
          // For 'kill' events, use get_kills objective
          // We'll apply all as kill increments to test the cap
          for (const _event of events) {
            challenge = applyKillIncrement(deployment, challenge, 1);
          }

          // After many increments, progress should never exceed target_count
          expect(challenge.progress).toBeLessThanOrEqual(targetCount);
          expect(challenge.progress).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('progress never goes below 0 after any sequence of decrements', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.constant(-1 as const), { minLength: 1, maxLength: 30 }),
        (deployment, targetCount, startProgress, decrements) => {
          const progress = Math.min(startProgress, targetCount);
          let challenge = makeEligibleChallenge('get_kills', targetCount, progress);

          for (const delta of decrements) {
            challenge = applyKillIncrement(deployment, challenge, delta);
          }

          // After many decrements, progress should never go below 0
          expect(challenge.progress).toBeGreaterThanOrEqual(0);
          expect(challenge.progress).toBeLessThanOrEqual(targetCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('progress stays in [0, target_count] for mixed increment/decrement sequences', () => {
    fc.assert(
      fc.property(
        deploymentRecordArb,
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.constantFrom(1 as const, -1 as const), { minLength: 1, maxLength: 50 }),
        (deployment, targetCount, startProgress, deltas) => {
          const progress = Math.min(startProgress, targetCount);
          let challenge = makeEligibleChallenge('get_kills', targetCount, progress);

          for (const delta of deltas) {
            challenge = applyKillIncrement(deployment, challenge, delta);

            // Invariant must hold after EVERY step
            expect(challenge.progress).toBeGreaterThanOrEqual(0);
            expect(challenge.progress).toBeLessThanOrEqual(targetCount);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
