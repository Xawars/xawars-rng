import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MasteryDashboard } from '../MasteryDashboard';
import type {
  Challenge,
  ChallengeSlot,
  MasteryBadge,
  MasteryTier,
  Objective,
  OperatorMastery,
  OperatorScope,
  MasteryStreakState,
} from '../../../types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 22: Mastery_Dashboard render content
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 *
 * For any valid combination of active challenges, operator mastery records, and
 * mastery badges, the MasteryDashboard renders all three sections:
 * 1. Active Challenges — shows daily, weekly, and mission challenges with progress
 * 2. Operator Mastery — shows operators sorted by mastery_points descending with tier and points
 * 3. Badge Collection — shows badges grouped by operator with tier and unlock timestamp
 */

// --- Mock useMastery ---

const mockUseMastery = vi.fn();

vi.mock('@/app/context/MasteryContext', () => ({
  useMastery: () => mockUseMastery(),
}));

// --- Mock tier-thresholds ---

vi.mock('@/app/lib/mastery/tier-thresholds', () => ({
  pointsToNextTier: (points: number) => {
    if (points >= 1000) return 0;
    if (points >= 600) return 1000 - points;
    if (points >= 300) return 600 - points;
    if (points >= 100) return 300 - points;
    return 100 - points;
  },
  TIER_THRESHOLDS: [
    { tier: 'Bronze', floor: 0, ceiling: 100, pointsToNextFromFloor: 100 },
    { tier: 'Silver', floor: 100, ceiling: 300, pointsToNextFromFloor: 200 },
    { tier: 'Gold', floor: 300, ceiling: 600, pointsToNextFromFloor: 300 },
    { tier: 'Platinum', floor: 600, ceiling: 1000, pointsToNextFromFloor: 400 },
    { tier: 'Diamond', floor: 1000, ceiling: Infinity, pointsToNextFromFloor: null },
  ],
}));

// --- Arbitraries ---

const tierArb = fc.constantFrom<MasteryTier>('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond');

const objectiveArb = fc.constantFrom<Objective>(
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills'
);

const slotArb = fc.constantFrom<ChallengeSlot>('daily', 'weekly', 'mission');

const operatorScopeArb = fc.constantFrom<OperatorScope>('any', 'random_pool', 'specific_operator');

const operatorIdArb = fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager', 'bandit', 'doc', 'rook');

function challengeArb(slot: ChallengeSlot): fc.Arbitrary<Challenge> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.constant('user-1'),
    slot: fc.constant(slot),
    role: fc.oneof(fc.constant(null), fc.constantFrom('Entry Fragger', 'Support', 'Anchor')),
    objective: objectiveArb,
    targetCount: fc.integer({ min: 1, max: 50 }),
    restriction: fc.oneof(
      fc.constant(null),
      fc.record({
        kind: fc.constantFrom('gadget_only' as const, 'playstyle' as const, 'loadout_limit' as const),
        value: fc.constantFrom('Smoke Grenade', 'Aggressive'),
      })
    ),
    operatorScope: operatorScopeArb,
    operatorPool: fc.array(operatorIdArb, { minLength: 0, maxLength: 3 }),
    xpReward: fc.integer({ min: 10, max: 750 }),
    masteryPointReward: fc.integer({ min: 5, max: 250 }),
    xpOverride: fc.constant(null),
    xpOverrideReason: fc.constant(null),
    progress: fc.integer({ min: 0, max: 50 }),
    generatedAt: fc.constant(new Date().toISOString()),
    expiresAt: slot === 'mission'
      ? fc.constant(null)
      : fc.constant(new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()),
    completedAt: fc.constant(null),
    discardedAt: fc.constant(null),
  }).map((c) => ({
    ...c,
    progress: Math.min(c.progress, c.targetCount),
  }));
}

function operatorMasteryArb(): fc.Arbitrary<OperatorMastery> {
  return fc.record({
    userId: fc.constant('user-1'),
    operatorId: operatorIdArb,
    masteryPoints: fc.integer({ min: 0, max: 1500 }),
    currentTier: tierArb,
  }).map((m) => {
    // Ensure tier matches points
    let tier: MasteryTier;
    if (m.masteryPoints >= 1000) tier = 'Diamond';
    else if (m.masteryPoints >= 600) tier = 'Platinum';
    else if (m.masteryPoints >= 300) tier = 'Gold';
    else if (m.masteryPoints >= 100) tier = 'Silver';
    else tier = 'Bronze';
    return { ...m, currentTier: tier };
  });
}

function masteryBadgeArb(): fc.Arbitrary<MasteryBadge> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.constant('user-1'),
    operatorId: operatorIdArb,
    tier: tierArb,
    unlockedAt: fc.constant(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  });
}

function streakArb(): fc.Arbitrary<MasteryStreakState> {
  return fc.record({
    userId: fc.constant('user-1'),
    currentStreak: fc.integer({ min: 0, max: 30 }),
    longestStreak: fc.integer({ min: 0, max: 60 }),
    lastCompletedDate: fc.oneof(fc.constant(null), fc.constant('2026-05-26')),
    runId: fc.uuid(),
    bonusesAwardedInRun: fc.constant([] as Array<3 | 7 | 30>),
  }).map((s) => ({
    ...s,
    longestStreak: Math.max(s.longestStreak, s.currentStreak),
  }));
}

// --- Default mock value ---

const defaultMasteryValue = {
  dailyChallenge: null,
  weeklyChallenge: null,
  activeOperatorMissions: [] as Challenge[],
  availableOperatorMissions: () => [],
  operatorMastery: {} as Record<string, OperatorMastery>,
  masteryBadges: [] as MasteryBadge[],
  masteryStreak: {
    userId: 'user-1',
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    runId: '',
    bonusesAwardedInRun: [],
  } as MasteryStreakState,
  onDeploymentAccepted: vi.fn(),
  onKillIncremented: vi.fn(),
  reportMatchResult: vi.fn(),
  activateOperatorMission: vi.fn(),
  discardChallenge: vi.fn(),
  refreshChallenges: vi.fn(),
  isLoading: false,
};

// --- Tests ---

describe('Feature: operator-mastery-mvp, Property 22: Mastery_Dashboard render content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMastery.mockReturnValue(defaultMasteryValue);
  });

  it('always renders all three section headings', () => {
    fc.assert(
      fc.property(
        fc.record({
          daily: fc.option(challengeArb('daily'), { nil: null }),
          weekly: fc.option(challengeArb('weekly'), { nil: null }),
          missions: fc.array(challengeArb('mission'), { minLength: 0, maxLength: 3 }),
          mastery: fc.array(operatorMasteryArb(), { minLength: 0, maxLength: 5 }),
          badges: fc.array(masteryBadgeArb(), { minLength: 0, maxLength: 5 }),
          streak: streakArb(),
        }),
        (data) => {
          cleanup();
          const masteryMap: Record<string, OperatorMastery> = {};
          for (const m of data.mastery) {
            masteryMap[m.operatorId] = m;
          }

          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            dailyChallenge: data.daily,
            weeklyChallenge: data.weekly,
            activeOperatorMissions: data.missions,
            operatorMastery: masteryMap,
            masteryBadges: data.badges,
            masteryStreak: data.streak,
          });

          render(<MasteryDashboard />);

          // All three section headings must always be present
          expect(screen.getByText('Active Challenges')).toBeInTheDocument();
          expect(screen.getByText('Operator Mastery')).toBeInTheDocument();
          expect(screen.getByText('Badge Collection')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('renders challenge cards for each active challenge with progress', () => {
    fc.assert(
      fc.property(
        fc.record({
          daily: challengeArb('daily'),
          weekly: challengeArb('weekly'),
          missions: fc.array(challengeArb('mission'), { minLength: 1, maxLength: 3 }),
        }),
        (data) => {
          cleanup();
          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            dailyChallenge: data.daily,
            weeklyChallenge: data.weekly,
            activeOperatorMissions: data.missions,
          });

          render(<MasteryDashboard />);

          // Daily and Weekly badges should be present
          expect(screen.getByText('Daily')).toBeInTheDocument();
          expect(screen.getByText('Weekly')).toBeInTheDocument();

          // Mission badges should be present (one per mission)
          const missionBadges = screen.getAllByText('Mission');
          expect(missionBadges.length).toBe(data.missions.length);

          // Progress for daily challenge should be visible (use getAllByText since
          // multiple challenges can have the same progress/target)
          const dailyProgress = `${data.daily.progress}/${data.daily.targetCount}`;
          expect(screen.getAllByText(dailyProgress).length).toBeGreaterThan(0);

          // Progress for weekly challenge should be visible
          const weeklyProgress = `${data.weekly.progress}/${data.weekly.targetCount}`;
          expect(screen.getAllByText(weeklyProgress).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('renders operator mastery cards sorted by points descending', () => {
    fc.assert(
      fc.property(
        fc.array(operatorMasteryArb(), { minLength: 2, maxLength: 6 }).map((arr) => {
          // Deduplicate by operatorId
          const seen = new Set<string>();
          return arr.filter((m) => {
            if (seen.has(m.operatorId)) return false;
            seen.add(m.operatorId);
            return true;
          });
        }).filter((arr) => arr.length >= 2),
        (masteryArr) => {
          cleanup();
          const masteryMap: Record<string, OperatorMastery> = {};
          for (const m of masteryArr) {
            masteryMap[m.operatorId] = m;
          }

          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            operatorMastery: masteryMap,
          });

          const { container } = render(<MasteryDashboard />);

          // Find the Operator Mastery section
          const section = container.querySelector('[aria-labelledby="operator-mastery-heading"]');
          expect(section).not.toBeNull();

          // Get all operator ID text elements within the section
          const sorted = [...masteryArr].sort((a, b) => b.masteryPoints - a.masteryPoints);

          // Each operator should have their points displayed (use getAllByText
          // since multiple operators can have the same points)
          for (const op of sorted) {
            expect(screen.getAllByText(`${op.masteryPoints} pts`).length).toBeGreaterThan(0);
          }

          // Each operator should have their tier badge displayed
          for (const op of sorted) {
            const tierElements = screen.getAllByText(op.currentTier);
            expect(tierElements.length).toBeGreaterThan(0);
          }

          // Verify sort order: operator names should appear in descending points order
          const operatorNameElements = section!.querySelectorAll('.text-sm.font-bold.text-white.capitalize');
          const renderedOrder = Array.from(operatorNameElements).map((el) => el.textContent);
          const expectedOrder = sorted.map((op) => op.operatorId);
          expect(renderedOrder).toEqual(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('renders badges grouped by operator with tier', () => {
    fc.assert(
      fc.property(
        fc.array(masteryBadgeArb(), { minLength: 1, maxLength: 8 }),
        (badges) => {
          cleanup();
          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            masteryBadges: badges,
          });

          render(<MasteryDashboard />);

          // Group badges by operator
          const byOperator: Record<string, MasteryBadge[]> = {};
          for (const badge of badges) {
            if (!byOperator[badge.operatorId]) byOperator[badge.operatorId] = [];
            byOperator[badge.operatorId].push(badge);
          }

          // Each operator with badges should appear in the badge section
          for (const operatorId of Object.keys(byOperator)) {
            // Operator name should be rendered (capitalized)
            expect(screen.getByText(operatorId)).toBeInTheDocument();
          }

          // Each badge tier should appear somewhere in the document
          for (const badge of badges) {
            const tierElements = screen.getAllByText(badge.tier);
            expect(tierElements.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('shows empty states when no data is present', () => {
    fc.assert(
      fc.property(streakArb(), (streak) => {
        cleanup();
        mockUseMastery.mockReturnValue({
          ...defaultMasteryValue,
          masteryStreak: streak,
        });

        render(<MasteryDashboard />);

        // Empty states should be shown for all three sections
        expect(screen.getByText('No active challenges')).toBeInTheDocument();
        expect(screen.getByText('Deploy operators to start earning mastery')).toBeInTheDocument();
        expect(screen.getByText('No badges unlocked yet')).toBeInTheDocument();
      }),
      { numRuns: 50 }
    );
  });

  it('renders streak display with current streak count', () => {
    fc.assert(
      fc.property(
        streakArb().filter((s) => s.currentStreak > 0),
        (streak) => {
          cleanup();
          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            masteryStreak: streak,
          });

          render(<MasteryDashboard />);

          // Streak count should be displayed
          expect(screen.getByText(`${streak.currentStreak} day streak`)).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('renders points-to-next-tier for non-Diamond operators', () => {
    const nonDiamondMastery = operatorMasteryArb().filter(
      (m) => m.currentTier !== 'Diamond'
    );

    fc.assert(
      fc.property(
        fc.array(nonDiamondMastery, { minLength: 1, maxLength: 3 }).map((arr) => {
          const seen = new Set<string>();
          return arr.filter((m) => {
            if (seen.has(m.operatorId)) return false;
            seen.add(m.operatorId);
            return true;
          });
        }).filter((arr) => arr.length >= 1),
        (masteryArr) => {
          cleanup();
          const masteryMap: Record<string, OperatorMastery> = {};
          for (const m of masteryArr) {
            masteryMap[m.operatorId] = m;
          }

          mockUseMastery.mockReturnValue({
            ...defaultMasteryValue,
            operatorMastery: masteryMap,
          });

          render(<MasteryDashboard />);

          // Each non-Diamond operator should show "X pts to next tier"
          // Use getAllByText since multiple operators can have the same value
          for (const op of masteryArr) {
            let expectedPtsToNext: number;
            if (op.masteryPoints < 100) expectedPtsToNext = 100 - op.masteryPoints;
            else if (op.masteryPoints < 300) expectedPtsToNext = 300 - op.masteryPoints;
            else if (op.masteryPoints < 600) expectedPtsToNext = 600 - op.masteryPoints;
            else expectedPtsToNext = 1000 - op.masteryPoints;

            expect(
              screen.getAllByText(`${expectedPtsToNext} pts to next tier`).length
            ).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
