import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeBanner } from '../ChallengeBanner';
import type { Challenge, ChallengeSlot, Objective, OperatorScope } from '../../../types/mastery';

/**
 * Feature: operator-mastery-mvp, Property 21: Roll-surface Challenge banner render content
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 7.7, 8.4
 *
 * For any valid Challenge with slot ∈ {daily, weekly, mission}, the ChallengeBanner
 * component renders:
 * - The slot label (Daily / Weekly / Mission)
 * - The objective description
 * - The role prefix (when role is non-null)
 * - Progress as current/target
 * - Time remaining (when expiresAt is non-null and in the future)
 * - Restriction text in expanded view (when restriction is non-null)
 */

// --- Mock useMastery ---

const mockUseMastery = vi.fn();

vi.mock('@/app/context/MasteryContext', () => ({
  useMastery: () => mockUseMastery(),
}));

// --- Arbitraries ---

const slotArb = fc.constantFrom<ChallengeSlot>('daily', 'weekly', 'mission');

const objectiveArb = fc.constantFrom<Objective>(
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills'
);

const operatorScopeArb = fc.constantFrom<OperatorScope>(
  'any',
  'random_pool',
  'specific_operator'
);

const roleArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom('Entry Fragger', 'Support', 'Anchor', 'Roamer', 'Intel / Recon')
);

const restrictionArb = fc.oneof(
  fc.constant(null),
  fc.record({
    kind: fc.constantFrom('gadget_only' as const, 'playstyle' as const, 'loadout_limit' as const),
    value: fc.constantFrom('Smoke Grenade', 'Aggressive', 'Shotgun Only'),
  })
);

const targetCountArb = fc.integer({ min: 1, max: 50 });
const progressArb = fc.integer({ min: 0, max: 50 });

function challengeArb(): fc.Arbitrary<Challenge> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.constant('user-1'),
    slot: slotArb,
    role: roleArb,
    objective: objectiveArb,
    targetCount: targetCountArb,
    restriction: restrictionArb,
    operatorScope: operatorScopeArb,
    operatorPool: fc.array(fc.constantFrom('ash', 'thermite', 'sledge', 'mute', 'jager'), { minLength: 0, maxLength: 5 }),
    xpReward: fc.integer({ min: 10, max: 750 }),
    masteryPointReward: fc.integer({ min: 5, max: 250 }),
    xpOverride: fc.constant(null),
    xpOverrideReason: fc.constant(null),
    progress: progressArb,
    generatedAt: fc.constant(new Date().toISOString()),
    expiresAt: fc.oneof(
      fc.constant(null),
      fc.constant(new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString())
    ),
    completedAt: fc.constant(null),
    discardedAt: fc.constant(null),
  }).map((c) => ({
    ...c,
    // Ensure progress doesn't exceed targetCount
    progress: Math.min(c.progress, c.targetCount),
  }));
}

// --- Default mock value ---

const defaultMasteryValue = {
  dailyChallenge: null,
  weeklyChallenge: null,
  activeOperatorMissions: [] as Challenge[],
  availableOperatorMissions: () => [],
  operatorMastery: {},
  masteryBadges: [],
  masteryStreak: {
    userId: '',
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    runId: '',
    bonusesAwardedInRun: [],
  },
  onDeploymentAccepted: vi.fn(),
  onKillIncremented: vi.fn(),
  reportMatchResult: vi.fn(),
  activateOperatorMission: vi.fn(),
  discardChallenge: vi.fn(),
  refreshChallenges: vi.fn(),
  isLoading: false,
};

// --- Helpers ---

const SLOT_LABELS: Record<ChallengeSlot, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  mission: 'Mission',
};

const OBJECTIVE_LABELS: Record<Objective, string> = {
  complete_deployments: 'Complete Deployments',
  win_rounds: 'Win Rounds',
  survive_rounds: 'Survive Rounds',
  get_kills: 'Get Kills',
};

function setupMock(challenge: Challenge) {
  const value = { ...defaultMasteryValue };
  switch (challenge.slot) {
    case 'daily':
      (value as any).dailyChallenge = challenge;
      break;
    case 'weekly':
      (value as any).weeklyChallenge = challenge;
      break;
    case 'mission':
      value.activeOperatorMissions = [challenge];
      break;
  }
  mockUseMastery.mockReturnValue(value);
}

// --- Tests ---

describe('Feature: operator-mastery-mvp, Property 21: Roll-surface Challenge banner render content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMastery.mockReturnValue(defaultMasteryValue);
  });

  it('always renders the slot label for any valid challenge', () => {
    fc.assert(
      fc.property(challengeArb(), (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        const expectedLabel = SLOT_LABELS[challenge.slot];
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      }),
      { numRuns: 200 }
    );
  });

  it('always renders the objective description for any valid challenge', () => {
    fc.assert(
      fc.property(challengeArb(), (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        const objectiveLabel = OBJECTIVE_LABELS[challenge.objective];
        // The objective text should appear (possibly with role prefix)
        if (challenge.role) {
          expect(screen.getByText(`[${challenge.role}] ${objectiveLabel}`)).toBeInTheDocument();
        } else {
          expect(screen.getByText(objectiveLabel)).toBeInTheDocument();
        }
      }),
      { numRuns: 200 }
    );
  });

  it('always renders progress as current/target for any valid challenge', () => {
    fc.assert(
      fc.property(challengeArb(), (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        const progressText = `${challenge.progress}/${challenge.targetCount}`;
        expect(screen.getByText(progressText)).toBeInTheDocument();
      }),
      { numRuns: 200 }
    );
  });

  it('renders time remaining when expiresAt is set and in the future', () => {
    const challengeWithExpiry = challengeArb().map((c) => ({
      ...c,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    }));

    fc.assert(
      fc.property(challengeWithExpiry, (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        // Should show time remaining matching pattern like "2h 15m" or "3d 5h"
        expect(screen.getByText(/\d+[dhm]/)).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('does not render time remaining when expiresAt is null', () => {
    const challengeNoExpiry = challengeArb().map((c) => ({
      ...c,
      expiresAt: null,
    }));

    fc.assert(
      fc.property(challengeNoExpiry, (challenge) => {
        cleanup();
        setupMock(challenge);

        const { container } = render(<ChallengeBanner slot={challenge.slot} />);

        // No clock icon or time text should be present
        // The time remaining uses a specific pattern with Clock icon
        const clockElements = container.querySelectorAll('[aria-hidden="true"]');
        const hasTimeText = Array.from(clockElements).some(
          (el) => el.closest('.text-zinc-500') && el.nextElementSibling?.textContent?.match(/\d+[dhm]/)
        );
        expect(hasTimeText).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('shows restriction in expanded view when restriction is non-null', () => {
    const challengeWithRestriction = challengeArb().map((c) => ({
      ...c,
      restriction: { kind: 'gadget_only' as const, value: 'Smoke Grenade' },
    }));

    fc.assert(
      fc.property(challengeWithRestriction, (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        // Expand the banner
        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByText('Restriction:')).toBeInTheDocument();
        expect(screen.getByText('Gadget: Smoke Grenade')).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('shows role in expanded view when role is non-null', () => {
    const challengeWithRole = challengeArb().map((c) => ({
      ...c,
      role: 'Entry Fragger',
    }));

    fc.assert(
      fc.property(challengeWithRole, (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        // Expand the banner
        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByText('Role:')).toBeInTheDocument();
        expect(screen.getByText('Entry Fragger')).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('shows XP and MP rewards in expanded view for any valid challenge', () => {
    fc.assert(
      fc.property(challengeArb(), (challenge) => {
        cleanup();
        setupMock(challenge);

        render(<ChallengeBanner slot={challenge.slot} />);

        // Expand the banner
        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByText(`${challenge.xpReward} XP`)).toBeInTheDocument();
        expect(screen.getByText(`${challenge.masteryPointReward} MP`)).toBeInTheDocument();
      }),
      { numRuns: 200 }
    );
  }, 30000);
});
