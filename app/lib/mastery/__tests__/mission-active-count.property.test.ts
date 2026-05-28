import fc from 'fast-check';
import type { Challenge, ActivateResult } from '@/app/types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 9: Operator_Mission active count invariant
 *
 * Validates: Requirements 6.2, 6.3, 6.4, 6.5
 *
 * For any sequence of activate-mission and discard-mission events for a user,
 * the count of active Operator_Missions stays within [0, 3] at every point in time,
 * an activateOperatorMission call returns {activated: true} if and only if the prior
 * count is strictly less than 3 and the mission is not already active, and any
 * discarded mission can be re-activated later.
 */

// --- Simulation of the MasteryContext mission management logic ---

/**
 * Simulates the core logic of activateOperatorMission and discardChallenge
 * from MasteryContext without React state or Supabase dependencies.
 *
 * This mirrors the logic in MasteryContext.tsx:
 * - activateOperatorMission: checks count < 3 and not already active
 * - discardChallenge: removes from active set (sets discardedAt)
 */
interface MissionState {
  activeMissions: Challenge[];
}

function makeMission(id: string, operatorId: string): Challenge {
  return {
    id,
    userId: 'user-1',
    slot: 'mission',
    role: null,
    objective: 'complete_deployments',
    targetCount: 5,
    restriction: null,
    operatorScope: 'specific_operator',
    operatorPool: [operatorId],
    xpReward: 60, // 5 * 12
    masteryPointReward: 25, // 5 * 5
    xpOverride: null,
    xpOverrideReason: null,
    progress: 0,
    generatedAt: new Date().toISOString(),
    expiresAt: null, // missions don't expire
    completedAt: null,
    discardedAt: null,
  };
}

function isChallengeActive(challenge: Challenge): boolean {
  if (challenge.completedAt !== null) return false;
  if (challenge.discardedAt !== null) return false;
  if (challenge.expiresAt && new Date(challenge.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/**
 * Simulates activateOperatorMission logic from MasteryContext.
 * Returns the ActivateResult and the updated state.
 */
function simulateActivate(
  state: MissionState,
  mission: Challenge
): { result: ActivateResult; nextState: MissionState } {
  const currentActive = state.activeMissions.filter(isChallengeActive);

  // Check mission limit (max 3)
  if (currentActive.length >= 3) {
    return {
      result: { activated: false, reason: 'mission_limit_reached' },
      nextState: state,
    };
  }

  // Check if already active
  if (currentActive.some((m) => m.id === mission.id)) {
    return {
      result: { activated: false, reason: 'already_active' },
      nextState: state,
    };
  }

  // Activate: add to active missions
  const activatedMission: Challenge = { ...mission, discardedAt: null };
  return {
    result: { activated: true },
    nextState: { activeMissions: [...currentActive, activatedMission] },
  };
}

/**
 * Simulates discardChallenge logic from MasteryContext.
 * Returns the updated state.
 */
function simulateDiscard(
  state: MissionState,
  challengeId: string
): MissionState {
  const missionIndex = state.activeMissions.findIndex((m) => m.id === challengeId);
  if (missionIndex === -1) return state;

  // Mark as discarded and remove from active set
  const updatedMissions = state.activeMissions.filter((m) => m.id !== challengeId);
  return { activeMissions: updatedMissions };
}

// --- Arbitraries ---

type MissionAction =
  | { type: 'activate'; missionId: string; operatorId: string }
  | { type: 'discard'; missionId: string };

// Generate a pool of mission IDs to work with
const missionIdArb = fc.constantFrom(
  'mission-1', 'mission-2', 'mission-3', 'mission-4', 'mission-5',
  'mission-6', 'mission-7', 'mission-8'
);

const operatorIdArb = fc.constantFrom(
  'ash', 'thermite', 'sledge', 'mute', 'jager', 'bandit', 'doc', 'rook'
);

const missionActionArb: fc.Arbitrary<MissionAction> = fc.oneof(
  fc.record({
    type: fc.constant('activate' as const),
    missionId: missionIdArb,
    operatorId: operatorIdArb,
  }),
  fc.record({
    type: fc.constant('discard' as const),
    missionId: missionIdArb,
  })
);

const actionSequenceArb = fc.array(missionActionArb, { minLength: 1, maxLength: 50 });

// --- Tests ---

describe('Feature: operator-mastery-mvp, Property 9: Operator_Mission active count invariant', () => {
  /**
   * The count of active Operator_Missions stays within [0, 3] at every point
   * in any sequence of activate/discard operations.
   */
  it('active mission count stays in [0, 3] for any sequence of activate/discard operations', () => {
    fc.assert(
      fc.property(actionSequenceArb, (actions) => {
        let state: MissionState = { activeMissions: [] };

        for (const action of actions) {
          if (action.type === 'activate') {
            const mission = makeMission(action.missionId, action.operatorId);
            const { nextState } = simulateActivate(state, mission);
            state = nextState;
          } else {
            state = simulateDiscard(state, action.missionId);
          }

          // Invariant: count is always in [0, 3]
          const activeCount = state.activeMissions.filter(isChallengeActive).length;
          expect(activeCount).toBeGreaterThanOrEqual(0);
          expect(activeCount).toBeLessThanOrEqual(3);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * activateOperatorMission succeeds (returns {activated: true}) if and only if
   * the prior active count is strictly less than 3 and the mission is not already active.
   */
  it('activateOperatorMission succeeds iff count < 3 and mission not already active', () => {
    fc.assert(
      fc.property(actionSequenceArb, (actions) => {
        let state: MissionState = { activeMissions: [] };

        for (const action of actions) {
          if (action.type === 'activate') {
            const mission = makeMission(action.missionId, action.operatorId);
            const currentActive = state.activeMissions.filter(isChallengeActive);
            const countBefore = currentActive.length;
            const alreadyActive = currentActive.some((m) => m.id === mission.id);

            const { result, nextState } = simulateActivate(state, mission);

            if (countBefore < 3 && !alreadyActive) {
              // Should succeed
              expect(result.activated).toBe(true);
              expect(result.reason).toBeUndefined();
            } else if (countBefore >= 3) {
              // Should fail with mission_limit_reached
              expect(result.activated).toBe(false);
              expect(result.reason).toBe('mission_limit_reached');
            } else if (alreadyActive) {
              // Should fail with already_active
              expect(result.activated).toBe(false);
              expect(result.reason).toBe('already_active');
            }

            state = nextState;
          } else {
            state = simulateDiscard(state, action.missionId);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * activateOperatorMission fails with 'mission_limit_reached' when active count = 3.
   */
  it('activateOperatorMission fails with mission_limit_reached when count is 3', () => {
    fc.assert(
      fc.property(
        operatorIdArb,
        operatorIdArb,
        operatorIdArb,
        operatorIdArb,
        (op1, op2, op3, op4) => {
          // Start with 3 active missions
          let state: MissionState = { activeMissions: [] };

          const m1 = makeMission('m-1', op1);
          const m2 = makeMission('m-2', op2);
          const m3 = makeMission('m-3', op3);

          // Activate 3 missions
          const r1 = simulateActivate(state, m1);
          state = r1.nextState;
          expect(r1.result.activated).toBe(true);

          const r2 = simulateActivate(state, m2);
          state = r2.nextState;
          expect(r2.result.activated).toBe(true);

          const r3 = simulateActivate(state, m3);
          state = r3.nextState;
          expect(r3.result.activated).toBe(true);

          // Verify count is 3
          expect(state.activeMissions.filter(isChallengeActive).length).toBe(3);

          // Try to activate a 4th mission — should fail
          const m4 = makeMission('m-4', op4);
          const r4 = simulateActivate(state, m4);

          expect(r4.result.activated).toBe(false);
          expect(r4.result.reason).toBe('mission_limit_reached');

          // State should not change
          expect(r4.nextState.activeMissions.filter(isChallengeActive).length).toBe(3);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * discardChallenge reduces the active count by 1 (when the mission exists).
   */
  it('discardChallenge reduces the active count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        operatorIdArb,
        (numMissions, baseOp) => {
          // Build state with numMissions active missions
          let state: MissionState = { activeMissions: [] };
          const missionIds: string[] = [];

          for (let i = 0; i < numMissions; i++) {
            const mission = makeMission(`mission-${i}`, `${baseOp}-${i}`);
            const { nextState } = simulateActivate(state, mission);
            state = nextState;
            missionIds.push(`mission-${i}`);
          }

          const countBefore = state.activeMissions.filter(isChallengeActive).length;
          expect(countBefore).toBe(numMissions);

          // Discard the first mission
          state = simulateDiscard(state, missionIds[0]);

          const countAfter = state.activeMissions.filter(isChallengeActive).length;
          expect(countAfter).toBe(countBefore - 1);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * After discarding, a new mission can be activated (count goes from 3 → 2 → activate succeeds).
   * This verifies that discarded missions free up a slot for new activations.
   */
  it('after discarding from count 3, a new mission can be activated', () => {
    fc.assert(
      fc.property(
        operatorIdArb,
        operatorIdArb,
        operatorIdArb,
        operatorIdArb,
        (op1, op2, op3, op4) => {
          let state: MissionState = { activeMissions: [] };

          // Fill to capacity (3 missions)
          const m1 = makeMission('m-1', op1);
          const m2 = makeMission('m-2', op2);
          const m3 = makeMission('m-3', op3);

          state = simulateActivate(state, m1).nextState;
          state = simulateActivate(state, m2).nextState;
          state = simulateActivate(state, m3).nextState;

          expect(state.activeMissions.filter(isChallengeActive).length).toBe(3);

          // Verify activation fails at capacity
          const m4 = makeMission('m-4', op4);
          const failResult = simulateActivate(state, m4);
          expect(failResult.result.activated).toBe(false);
          expect(failResult.result.reason).toBe('mission_limit_reached');

          // Discard one mission (count goes from 3 → 2)
          state = simulateDiscard(state, 'm-2');
          expect(state.activeMissions.filter(isChallengeActive).length).toBe(2);

          // Now activation should succeed (count < 3)
          const successResult = simulateActivate(state, m4);
          expect(successResult.result.activated).toBe(true);
          expect(
            successResult.nextState.activeMissions.filter(isChallengeActive).length
          ).toBe(3);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * A discarded mission can be re-activated later (Requirement 6.5).
   * After discarding a mission, the same mission ID can be activated again
   * as long as the count is below 3.
   */
  it('a discarded mission can be re-activated later', () => {
    fc.assert(
      fc.property(operatorIdArb, operatorIdArb, (op1, op2) => {
        let state: MissionState = { activeMissions: [] };

        // Activate a mission
        const m1 = makeMission('m-reactivate', op1);
        const r1 = simulateActivate(state, m1);
        state = r1.nextState;
        expect(r1.result.activated).toBe(true);
        expect(state.activeMissions.filter(isChallengeActive).length).toBe(1);

        // Discard it
        state = simulateDiscard(state, 'm-reactivate');
        expect(state.activeMissions.filter(isChallengeActive).length).toBe(0);

        // Re-activate the same mission
        const m1Again = makeMission('m-reactivate', op1);
        const r2 = simulateActivate(state, m1Again);
        state = r2.nextState;
        expect(r2.result.activated).toBe(true);
        expect(state.activeMissions.filter(isChallengeActive).length).toBe(1);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * The active count never exceeds 3 even with rapid interleaved activate/discard sequences.
   * This is a stress test with longer random sequences.
   */
  it('active count never exceeds 3 under stress (long random sequences)', () => {
    const longSequenceArb = fc.array(missionActionArb, { minLength: 20, maxLength: 100 });

    fc.assert(
      fc.property(longSequenceArb, (actions) => {
        let state: MissionState = { activeMissions: [] };
        let maxObserved = 0;

        for (const action of actions) {
          if (action.type === 'activate') {
            const mission = makeMission(action.missionId, action.operatorId);
            const { nextState } = simulateActivate(state, mission);
            state = nextState;
          } else {
            state = simulateDiscard(state, action.missionId);
          }

          const activeCount = state.activeMissions.filter(isChallengeActive).length;
          maxObserved = Math.max(maxObserved, activeCount);
        }

        // The maximum observed count should never exceed 3
        expect(maxObserved).toBeLessThanOrEqual(3);
      }),
      { numRuns: 200 }
    );
  });
});
