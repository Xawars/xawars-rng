import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChallengeBanner } from '../ChallengeBanner';
import type { Challenge } from '../../../types/mastery';

// Mock useMastery hook
const mockUseMastery = vi.fn();

vi.mock('@/app/context/MasteryContext', () => ({
  useMastery: () => mockUseMastery(),
}));

// --- Test Data ---

function makeDailyChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'daily-1',
    userId: 'user-1',
    slot: 'daily',
    role: 'Entry Fragger',
    objective: 'complete_deployments',
    targetCount: 5,
    restriction: null,
    operatorScope: 'any',
    operatorPool: [],
    xpReward: 50,
    masteryPointReward: 25,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 2,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

function makeWeeklyChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'weekly-1',
    userId: 'user-1',
    slot: 'weekly',
    role: null,
    objective: 'win_rounds',
    targetCount: 20,
    restriction: { kind: 'gadget_only', value: 'Smoke Grenade' },
    operatorScope: 'random_pool',
    operatorPool: ['ash', 'thermite', 'sledge'],
    xpReward: 300,
    masteryPointReward: 100,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 8,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

function makeMissionChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'mission-1',
    userId: 'user-1',
    slot: 'mission',
    role: null,
    objective: 'get_kills',
    targetCount: 10,
    restriction: null,
    operatorScope: 'specific_operator',
    operatorPool: ['ash'],
    xpReward: 120,
    masteryPointReward: 50,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 7,
    generatedAt: new Date().toISOString(),
    expiresAt: null,
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

const defaultMasteryValue = {
  dailyChallenge: null,
  weeklyChallenge: null,
  activeOperatorMissions: [],
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

describe('ChallengeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMastery.mockReturnValue(defaultMasteryValue);
  });

  describe('rendering', () => {
    it('renders nothing when no challenge exists for the slot', () => {
      const { container } = render(<ChallengeBanner slot="daily" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders the daily challenge banner with slot badge', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      expect(screen.getByText('Daily')).toBeInTheDocument();
    });

    it('renders the weekly challenge banner', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        weeklyChallenge: makeWeeklyChallenge(),
      });

      render(<ChallengeBanner slot="weekly" />);

      expect(screen.getByText('Weekly')).toBeInTheDocument();
    });

    it('renders the mission challenge banner', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        activeOperatorMissions: [makeMissionChallenge()],
      });

      render(<ChallengeBanner slot="mission" />);

      expect(screen.getByText('Mission')).toBeInTheDocument();
    });

    it('displays the objective description', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      expect(screen.getByText('[Entry Fragger] Complete Deployments')).toBeInTheDocument();
    });

    it('displays progress as current/target', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ progress: 3, targetCount: 5 }),
      });

      render(<ChallengeBanner slot="daily" />);

      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('displays time remaining for challenges with expiresAt', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        }),
      });

      render(<ChallengeBanner slot="daily" />);

      // Should show something like "2h 30m"
      expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument();
    });

    it('does not display time remaining for missions (no expiresAt)', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        activeOperatorMissions: [makeMissionChallenge()],
      });

      render(<ChallengeBanner slot="mission" />);

      // No clock icon or time text should be present in the collapsed view
      expect(screen.queryByText(/\d+[dhm]/)).not.toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('starts collapsed by default', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      // Expanded details should not be visible
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });

    it('expands on click to show full details', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ role: 'Entry Fragger' }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Expanded details should now be visible
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Role:')).toBeInTheDocument();
      expect(screen.getByText('Entry Fragger')).toBeInTheDocument();
    });

    it('collapses on second click', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button); // expand
      fireEvent.click(button); // collapse

      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });

    it('shows restriction in expanded view', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        weeklyChallenge: makeWeeklyChallenge({
          restriction: { kind: 'gadget_only', value: 'Smoke Grenade' },
        }),
      });

      render(<ChallengeBanner slot="weekly" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Restriction:')).toBeInTheDocument();
      expect(screen.getByText('Gadget: Smoke Grenade')).toBeInTheDocument();
    });

    it('shows operator pool in expanded view for random_pool scope', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        weeklyChallenge: makeWeeklyChallenge({
          operatorScope: 'random_pool',
          operatorPool: ['ash', 'thermite', 'sledge'],
        }),
      });

      render(<ChallengeBanner slot="weekly" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Operators:')).toBeInTheDocument();
      expect(screen.getByText('ash, thermite, sledge')).toBeInTheDocument();
    });

    it('shows XP and mastery point rewards in expanded view', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ xpReward: 50, masteryPointReward: 25 }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('50 XP')).toBeInTheDocument();
      expect(screen.getByText('25 MP')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has aria-expanded attribute on the toggle button', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-controls linking to the details region', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-controls', 'challenge-details-daily');
    });

    it('has a descriptive aria-label on the toggle button', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ progress: 2, targetCount: 5 }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('Daily challenge');
      expect(button.getAttribute('aria-label')).toContain('2 of 5');
    });

    it('expanded details region has role="region" with aria-labelledby', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-labelledby', 'challenge-banner-daily');
    });

    it('has a progressbar role in the expanded view', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ progress: 3, targetCount: 5 }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('edge cases', () => {
    it('handles zero progress correctly', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ progress: 0, targetCount: 5 }),
      });

      render(<ChallengeBanner slot="daily" />);

      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('handles completed progress (progress equals target)', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ progress: 5, targetCount: 5 }),
      });

      render(<ChallengeBanner slot="daily" />);

      expect(screen.getByText('5/5')).toBeInTheDocument();
    });

    it('does not show role in expanded view when role is null', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ role: null }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByText('Role:')).not.toBeInTheDocument();
    });

    it('does not show operators section when scope is "any"', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge({ operatorScope: 'any', operatorPool: [] }),
      });

      render(<ChallengeBanner slot="daily" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByText('Operators:')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      mockUseMastery.mockReturnValue({
        ...defaultMasteryValue,
        dailyChallenge: makeDailyChallenge(),
      });

      const { container } = render(<ChallengeBanner slot="daily" className="mt-4" />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('mt-4');
    });
  });
});
