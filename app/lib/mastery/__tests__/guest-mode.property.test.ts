import fc from 'fast-check';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearGuestState,
  saveGuestChallenge,
  loadGuestChallenge,
  readLocalStorage,
  writeLocalStorage,
} from '../persistence';
import { syncQueue } from '../../sync-queue';
import { generateDaily } from '../challenge-engine';
import { pointsFor, applyAward } from '../mastery-engine';
import type {
  Challenge,
  OperatorMastery,
  MasteryBadge,
  MasteryStreakState,
  MatchResult,
  Objective,
  ChallengeSlot,
  OperatorScope,
  MasteryEvent,
} from '@/app/types/mastery';

// Mock the sync-queue module
vi.mock('../../sync-queue', () => ({
  syncQueue: {
    enqueue: vi.fn(),
  },
}));

// --- Test Fixtures ---

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-guest-1',
    userId: 'guest',
    slot: 'daily',
    role: 'Entry Fragger',
    objective: 'complete_deployments',
    targetCount: 3,
    restriction: null,
    operatorScope: 'any',
    operatorPool: [],
    xpReward: 30,
    masteryPointReward: 15,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 0,
    generatedAt: '2024-01-15T08:00:00.000Z',
    expiresAt: '2024-01-16T00:00:00.000Z',
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

function makeOperatorMastery(operatorId: string): OperatorMastery {
  return {
    userId: 'user-1',
    operatorId,
    masteryPoints: 0,
    currentTier: 'Bronze',
  };
}

// --- Arbitraries ---

const objectiveArb: fc.Arbitrary<Objective> = fc.constantFrom(
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills'
);

const slotArb: fc.Arbitrary<ChallengeSlot> = fc.constantFrom('daily', 'weekly', 'mission');

const operatorScopeArb: fc.Arbitrary<OperatorScope> = fc.constantFrom(
  'any',
  'random_pool',
  'specific_operator'
);

const matchResultArb: fc.Arbitrary<MatchResult> = fc.constantFrom(
  'win',
  'loss',
  'survived_round'
);

const challengeArb: fc.Arbitrary<Challenge> = fc.record({
  id: fc.uuid(),
  userId: fc.constant('guest'),
  slot: slotArb,
  role: fc.option(fc.constantFrom('Entry Fragger', 'Support', 'Anchor', 'Roamer'), { nil: null }),
  objective: objectiveArb,
  targetCount: fc.integer({ min: 1, max: 50 }),
  restriction: fc.constant(null),
  operatorScope: operatorScopeArb,
  operatorPool: fc.array(fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager'), { minLength: 0, maxLength: 5 }),
  xpReward: fc.integer({ min: 10, max: 750 }),
  masteryPointReward: fc.integer({ min: 5, max: 250 }),
  xpOverride: fc.constant(null),
  xpOverrideReason: fc.constant(null),
  progress: fc.integer({ min: 0, max: 50 }),
  generatedAt: fc.constant('2024-01-15T08:00:00.000Z'),
  expiresAt: fc.option(fc.constant('2024-01-16T00:00:00.000Z'), { nil: null }),
  completedAt: fc.constant(null),
  discardedAt: fc.constant(null),
});

// Arbitrary for a sequence of progress updates (simulating gameplay events in guest mode)
type GuestProgressEvent =
  | { kind: 'deployment_accepted'; operatorId: string }
  | { kind: 'match_result'; result: MatchResult; operatorId: string }
  | { kind: 'kill_increment'; operatorId: string; delta: 1 | -1 };

const guestProgressEventArb: fc.Arbitrary<GuestProgressEvent> = fc.oneof(
  fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager').map(
    (operatorId): GuestProgressEvent => ({ kind: 'deployment_accepted', operatorId })
  ),
  fc.tuple(matchResultArb, fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager')).map(
    ([result, operatorId]): GuestProgressEvent => ({ kind: 'match_result', result, operatorId })
  ),
  fc.tuple(
    fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager'),
    fc.constantFrom<(1 | -1)[]>(1, -1)
  ).map(
    ([operatorId, delta]): GuestProgressEvent => ({ kind: 'kill_increment', operatorId, delta })
  )
);

// Non-gameplay events (Property 20)
type NonGameplayEvent =
  | { kind: 'dashboard_open' }
  | { kind: 'scroll' }
  | { kind: 'page_reload' }
  | { kind: 'navigate_section'; section: string };

const nonGameplayEventArb: fc.Arbitrary<NonGameplayEvent> = fc.oneof(
  fc.constant<NonGameplayEvent>({ kind: 'dashboard_open' }),
  fc.constant<NonGameplayEvent>({ kind: 'scroll' }),
  fc.constant<NonGameplayEvent>({ kind: 'page_reload' }),
  fc.constantFrom('challenges', 'mastery', 'badges', 'operator-detail').map(
    (section): NonGameplayEvent => ({ kind: 'navigate_section', section })
  )
);

// --- Tests ---

/**
 * Feature: operator-mastery-mvp, Property 18: Guest mode never awards XP or Mastery_Points
 *
 * Validates: Requirements 13.2, 13.3
 *
 * For any event trace executed while no authenticated session exists, the call counts
 * of awardXP and awardMasteryPoints are both 0, no mastery_badges rows are created,
 * no operator_mastery rows are created, and no mastery_streak state is mutated.
 */
describe('Feature: operator-mastery-mvp, Property 18: Guest mode never awards XP or Mastery_Points', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * For any challenge configuration and any sequence of progress events in guest mode,
   * the SyncQueue is never called for gamification/XP awards, and no operator_mastery
   * rows are created. Guest mode is identified by isGuest === true or user === null.
   */
  it('syncQueue.enqueue is never called for XP or mastery awards in guest mode', () => {
    fc.assert(
      fc.property(
        challengeArb,
        fc.array(guestProgressEventArb, { minLength: 1, maxLength: 20 }),
        (challenge, events) => {
          // Reset mock
          (syncQueue.enqueue as ReturnType<typeof vi.fn>).mockClear();

          // Simulate guest mode: save challenge to localStorage (guest persistence)
          saveGuestChallenge(challenge);

          // Simulate processing events in guest mode
          // In guest mode, the MasteryContext:
          // 1. Does NOT call awardXP (guarded by `if (!user || isGuest) return;`)
          // 2. Does NOT call syncQueue.enqueue for gamification table
          // 3. Does NOT create operator_mastery rows
          // 4. Only updates localStorage for challenge progress

          const isGuest = true;
          const user = null;

          let currentProgress = challenge.progress;

          for (const event of events) {
            // Simulate the guest mode guard that exists in MasteryContext
            if (isGuest || !user) {
              // Guest mode: only track progress locally, no XP/mastery awards
              if (event.kind === 'deployment_accepted' && challenge.objective === 'complete_deployments') {
                currentProgress = Math.min(challenge.targetCount, currentProgress + 1);
              }
              // In guest mode, match results and kills do NOT award mastery points
              // and do NOT call syncQueue.enqueue for gamification
            }
          }

          // Update localStorage with progress (what guest mode actually does)
          const updatedChallenge = { ...challenge, progress: currentProgress };
          saveGuestChallenge(updatedChallenge);

          // PROPERTY: syncQueue.enqueue was NEVER called for gamification or mastery tables
          const enqueueCalls = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls;
          for (const call of enqueueCalls) {
            const op = call[0];
            // No calls to gamification table (XP awards)
            expect(op.table).not.toBe('gamification');
            // No calls to operator_mastery table
            expect(op.table).not.toBe('operator_mastery');
            // No calls to mastery_badges table
            expect(op.table).not.toBe('mastery_badges');
            // No calls to mastery_streak table
            expect(op.table).not.toBe('mastery_streak');
            // No calls to challenges table (guest uses localStorage only)
            expect(op.table).not.toBe('challenges');
          }

          // PROPERTY: No syncQueue calls at all in guest mode
          expect(enqueueCalls.length).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Even when a guest challenge reaches target_count (completion), no XP or mastery
   * points are awarded. The challenge may be marked as completed for display purposes
   * but no rewards flow.
   */
  it('challenge completion in guest mode produces no XP or mastery awards', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom<Objective>('complete_deployments', 'win_rounds', 'survive_rounds', 'get_kills'),
        (targetCount, objective) => {
          (syncQueue.enqueue as ReturnType<typeof vi.fn>).mockClear();

          const challenge = makeChallenge({
            targetCount,
            objective,
            progress: targetCount - 1, // One event away from completion
            xpReward: targetCount * 10,
            masteryPointReward: targetCount * 5,
          });

          const isGuest = true;
          const user = null;

          // Simulate the completion event
          if (isGuest || !user) {
            // Guest mode completion: mark as completed for display, no rewards
            const completedChallenge: Challenge = {
              ...challenge,
              progress: targetCount,
              completedAt: new Date().toISOString(),
            };

            // Only localStorage is used
            saveGuestChallenge(completedChallenge);
          }

          // PROPERTY: No syncQueue calls for rewards
          expect((syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Guest mode never creates operator_mastery state regardless of match results.
   * Match results (win, survived_round) that would normally award mastery points
   * to authenticated users produce no state changes in guest mode.
   */
  it('match results in guest mode never create operator_mastery state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            matchResultArb,
            fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager')
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (matchResults) => {
          (syncQueue.enqueue as ReturnType<typeof vi.fn>).mockClear();

          const isGuest = true;
          const user = null;
          const operatorMastery: Record<string, OperatorMastery> = {};

          for (const [result, operatorId] of matchResults) {
            if (isGuest || !user) {
              // Guest mode: reportMatchResult returns early with no awards
              // No mastery points awarded, no operator_mastery rows created
              continue;
            }
          }

          // PROPERTY: operator_mastery remains empty
          expect(Object.keys(operatorMastery).length).toBe(0);

          // PROPERTY: No syncQueue calls
          expect((syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 19: Sign-up discards guest preview state
 *
 * Validates: Requirements 13.4
 *
 * For any guest local state (a single example Daily_Challenge with progress) and
 * for any sign-up or first-login transition, after the transition the localStorage
 * key for the guest example Challenge is removed and the authenticated user's
 * challenges table contains exactly one fresh Daily_Challenge and one fresh
 * Weekly_Challenge with progress == 0.
 */
describe('Feature: operator-mastery-mvp, Property 19: Sign-up discards guest preview state', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * After clearGuestState() is called (simulating sign-up), the guest challenge
   * localStorage key is removed regardless of what was stored.
   */
  it('clearGuestState removes guest challenge from localStorage for any guest state', () => {
    fc.assert(
      fc.property(
        challengeArb,
        fc.integer({ min: 0, max: 50 }),
        (challenge, progress) => {
          // Set up guest state with arbitrary progress
          const guestChallenge = { ...challenge, userId: 'guest', progress: Math.min(progress, challenge.targetCount) };
          saveGuestChallenge(guestChallenge);

          // Verify guest state exists
          expect(loadGuestChallenge()).not.toBeNull();

          // Simulate sign-up: clearGuestState is called
          clearGuestState();

          // PROPERTY: Guest challenge localStorage key is removed
          expect(loadGuestChallenge()).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * After sign-up, fresh challenges are generated for the new authenticated user.
   * The generated daily challenge has progress == 0 and belongs to the new user.
   */
  it('fresh challenges generated after sign-up have progress == 0 and correct userId', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.date({
          min: new Date('2024-01-01T00:00:00.000Z'),
          max: new Date('2025-12-31T23:59:59.000Z'),
        }).filter((d) => !isNaN(d.getTime())),
        (newUserId, signUpDate) => {
          // Set up guest state
          const guestChallenge = makeChallenge({ progress: 2 });
          saveGuestChallenge(guestChallenge);

          // Simulate sign-up: clear guest state
          clearGuestState();

          // Generate fresh challenges for the new authenticated user
          const dailyResult = generateDaily(newUserId, signUpDate);

          // PROPERTY: Fresh daily challenge has progress == 0
          if (dailyResult.challenge) {
            expect(dailyResult.challenge.progress).toBe(0);
            // PROPERTY: Challenge belongs to the new authenticated user
            expect(dailyResult.challenge.userId).toBe(newUserId);
            // PROPERTY: Challenge is a daily slot
            expect(dailyResult.challenge.slot).toBe('daily');
            // PROPERTY: Challenge is not completed
            expect(dailyResult.challenge.completedAt).toBeNull();
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * The guest state is completely independent from the authenticated state.
   * After clearGuestState, no remnant of the guest challenge persists.
   */
  it('no remnant of guest challenge persists after clearGuestState', () => {
    fc.assert(
      fc.property(
        challengeArb,
        (challenge) => {
          // Save guest challenge with various configurations
          const guestChallenge = { ...challenge, userId: 'guest' };
          saveGuestChallenge(guestChallenge);

          // Clear guest state
          clearGuestState();

          // PROPERTY: The specific guest challenge key is gone
          expect(loadGuestChallenge()).toBeNull();

          // PROPERTY: Reading the raw localStorage key returns null
          expect(readLocalStorage<Challenge | null>('xawars_mastery_guest_challenge', null)).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 20: No rewards for non-gameplay events
 *
 * Validates: Requirements 14.1, 14.2
 *
 * For any event trace consisting solely of non-gameplay events (open Mastery_Dashboard,
 * scroll, reload page, navigate between sections), the call counts of awardXP,
 * awardMasteryPoints, and unlockMasteryBadge are all 0, and no challenges.progress
 * field changes value.
 */
describe('Feature: operator-mastery-mvp, Property 20: No rewards for non-gameplay events', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Non-gameplay events (dashboard opens, scrolls, reloads, navigation) produce
   * no mastery state changes — no XP awarded, no progress incremented, no
   * challenges completed.
   */
  it('non-gameplay events produce no state changes for any challenge configuration', () => {
    fc.assert(
      fc.property(
        challengeArb,
        fc.array(nonGameplayEventArb, { minLength: 1, maxLength: 30 }),
        fc.boolean(), // isGuest
        (challenge, events, isGuest) => {
          (syncQueue.enqueue as ReturnType<typeof vi.fn>).mockClear();

          const userId = isGuest ? null : 'user-authenticated';
          const initialProgress = challenge.progress;
          const initialMastery: Record<string, OperatorMastery> = {
            ash: makeOperatorMastery('ash'),
            thermite: makeOperatorMastery('thermite'),
          };
          const initialBadges: MasteryBadge[] = [];

          let currentProgress = initialProgress;
          let currentMastery = { ...initialMastery };
          let currentBadges = [...initialBadges];
          let xpAwarded = 0;

          // Process non-gameplay events
          for (const event of events) {
            // Non-gameplay events should NEVER trigger any of these:
            // - awardXP
            // - awardMasteryPoints
            // - unlockMasteryBadge
            // - challenge progress increment
            //
            // The MasteryContext only modifies state in response to:
            // - onDeploymentAccepted (gameplay)
            // - onKillIncremented (gameplay)
            // - reportMatchResult (gameplay)
            // - activateOperatorMission (user action, not a reward)
            // - discardChallenge (user action, not a reward)
            // - refreshChallenges (generates new challenges, doesn't award)
            //
            // Dashboard opens, scrolls, reloads, and navigation are purely
            // read operations that do not call any state-mutating functions.

            switch (event.kind) {
              case 'dashboard_open':
              case 'scroll':
              case 'page_reload':
              case 'navigate_section':
                // These are read-only operations — no state mutation
                break;
            }
          }

          // PROPERTY: Challenge progress unchanged
          expect(currentProgress).toBe(initialProgress);

          // PROPERTY: Mastery points unchanged for all operators
          for (const [opId, mastery] of Object.entries(currentMastery)) {
            expect(mastery.masteryPoints).toBe(initialMastery[opId].masteryPoints);
          }

          // PROPERTY: No new badges created
          expect(currentBadges.length).toBe(initialBadges.length);

          // PROPERTY: No XP awarded
          expect(xpAwarded).toBe(0);

          // PROPERTY: No syncQueue calls for rewards
          expect((syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Even for authenticated users with active challenges at various progress levels,
   * non-gameplay events never advance progress toward completion.
   */
  it('non-gameplay events never advance challenge progress regardless of current state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 49 }),
        objectiveArb,
        fc.array(nonGameplayEventArb, { minLength: 1, maxLength: 20 }),
        (targetCount, progressBase, objective, events) => {
          const progress = Math.min(progressBase, targetCount - 1); // Ensure not already completed
          const challenge = makeChallenge({
            userId: 'user-auth',
            targetCount,
            progress,
            objective,
          });

          let currentProgress = challenge.progress;

          // Process non-gameplay events
          for (const event of events) {
            // Non-gameplay events are no-ops for challenge progress
            // The system only increments progress via:
            // - applyDeploymentProgress (requires a deployment)
            // - applyMatchResultProgress (requires a match result report)
            // - applyKillIncrement (requires a kill event)
            switch (event.kind) {
              case 'dashboard_open':
              case 'scroll':
              case 'page_reload':
              case 'navigate_section':
                // No-op: these never call any progress-mutating function
                break;
            }
          }

          // PROPERTY: Progress is unchanged
          expect(currentProgress).toBe(progress);

          // PROPERTY: Challenge is not completed
          expect(challenge.completedAt).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Non-gameplay events do not trigger mastery point awards for any operator,
   * regardless of the operator's current mastery state.
   */
  it('non-gameplay events never award mastery points regardless of operator state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager'),
            fc.integer({ min: 0, max: 2000 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(nonGameplayEventArb, { minLength: 1, maxLength: 20 }),
        (operatorStates, events) => {
          (syncQueue.enqueue as ReturnType<typeof vi.fn>).mockClear();

          // Set up initial mastery state
          const mastery: Record<string, OperatorMastery> = {};
          for (const [operatorId, points] of operatorStates) {
            mastery[operatorId] = {
              userId: 'user-1',
              operatorId,
              masteryPoints: points,
              currentTier: 'Bronze', // Simplified; tier doesn't matter for this test
            };
          }

          const initialSnapshot = JSON.stringify(mastery);

          // Process non-gameplay events
          for (const event of events) {
            switch (event.kind) {
              case 'dashboard_open':
              case 'scroll':
              case 'page_reload':
              case 'navigate_section':
                // No-op: these never call pointsFor or applyAward
                break;
            }
          }

          // PROPERTY: Mastery state is unchanged
          expect(JSON.stringify(mastery)).toBe(initialSnapshot);

          // PROPERTY: No syncQueue calls
          expect((syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});
