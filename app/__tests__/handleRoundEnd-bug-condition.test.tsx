/**
 * Bug Condition Regression Test — Match Counter Increment
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 *
 * This test asserts the EXPECTED (correct) behavior: handleRoundEnd should NOT
 * call updateMapPerformance or updateSitePerformance with { matches: 1 }.
 *
 * On UNFIXED code this test FAILS — proving the bug exists.
 * After the fix, this test will PASS — proving the bug is resolved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

const mockUpdateMapPerformance = vi.fn();
const mockUpdateSitePerformance = vi.fn();
const mockUpdateMapWinLoss = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    session: { accessToken: 'token', refreshToken: 'refresh', expiresAt: 9999 },
    isGuest: false,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/app/context/DataContext', () => ({
  useData: () => ({
    deploymentHistory: [],
    addDeployment: vi.fn(),
    deleteDeployment: vi.fn(),
    clearDeployments: vi.fn(),
    operatorStats: {},
    updateOperatorStat: vi.fn(),
    mapPerformanceRecords: {},
    updateMapPerformance: mockUpdateMapPerformance,
    sitePerformanceRecords: {},
    updateSitePerformance: mockUpdateSitePerformance,
    mapWinLossRecords: {},
    updateMapWinLoss: mockUpdateMapWinLoss,
    migrationStatus: 'idle' as const,
    startMigration: vi.fn(),
    dismissMigration: vi.fn(),
  }),
}));

vi.mock('@/app/components/onboarding/OnboardingProvider', () => ({
  useOnboardingContext: () => ({
    isOnboardingComplete: true,
    hasEntryPlayed: true,
    hasCompletedFirstRoll: true,
    isTipDismissed: () => true,
    completeOnboarding: vi.fn(),
    markEntryPlayed: vi.fn(),
    markFirstRoll: vi.fn(),
    dismissTip: vi.fn(),
    resetOnboarding: vi.fn(),
  }),
}));

// Passthrough ProtectedRoute — just render children
vi.mock('@/app/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  isGuestMode: () => false,
  clearGuestMode: vi.fn(),
}));

// Passthrough TacticalEntry — just render children
vi.mock('@/app/components/onboarding', () => ({
  TacticalEntry: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WelcomeModal: () => null,
  FirstActionTooltip: () => null,
}));

// Mock account components
vi.mock('@/app/components/account', () => ({
  AccountIndicator: () => null,
  SetCallsignModal: () => null,
  shouldPromptCallsign: () => false,
}));

// Mock heavy child components that aren't relevant to this test
vi.mock('@/app/components/mastery', () => ({
  MasteryHeader: () => null,
}));

vi.mock('@/app/components/rivalry/RivalryView', () => ({
  RivalryView: () => null,
}));

vi.mock('@/app/components/HotStreakIndicator', () => ({
  HotStreakIndicator: () => null,
}));

vi.mock('@/app/components/SessionSummaryModal', () => ({
  SessionSummaryModal: () => null,
}));

// --- Test Data ---

const TEST_OPERATOR = {
  id: 'ash',
  name: 'Ash',
  side: 'attacker' as const,
  primaries: ['R4-C'],
  secondaries: ['5.7 USG'],
  gadgets: ['Breach Charge'],
  roles: ['Entry'],
};

const TEST_DEPLOYMENT_ID = 'test-deployment-001';

const TEST_HISTORY = [
  {
    id: Date.now(),
    operator: TEST_OPERATOR,
    loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' },
    matchType: 'Ranked',
    deploymentId: TEST_DEPLOYMENT_ID,
    schemaVersion: 2,
    matches: [
      {
        id: 'match-001',
        mapId: 'clubhouse',
        startedAt: new Date().toISOString(),
        // no endedAt — match is active
        rounds: [],
      },
    ],
  },
];

describe('Bug Condition: handleRoundEnd incorrectly increments match counter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set up localStorage with the state needed to trigger the bug condition
    localStorage.setItem('xawars_currentOperator', JSON.stringify(TEST_OPERATOR));
    localStorage.setItem('xawars_currentDeploymentId', JSON.stringify(TEST_DEPLOYMENT_ID));
    localStorage.setItem('xawars_history', JSON.stringify(TEST_HISTORY));
    localStorage.setItem('xawars_currentMapId', JSON.stringify('clubhouse'));
    localStorage.setItem('xawars_currentSiteId', JSON.stringify('cctv'));
    localStorage.setItem('xawars_kills', JSON.stringify(5));
    localStorage.setItem('xawars_deaths', JSON.stringify(2));
  });

  it('handleRoundEnd should NOT call updateMapPerformance with { matches: 1 }', async () => {
    const Home = (await import('@/app/page')).default;

    await act(async () => {
      render(<Home />);
    });

    // Click "End Round" to reveal win/loss buttons
    const endRoundBtn = screen.getByRole('button', { name: /end round/i });
    await act(async () => {
      fireEvent.click(endRoundBtn);
    });

    // Click "Win" to trigger handleRoundEnd('win')
    const winBtn = screen.getByRole('button', { name: /^win$/i });
    await act(async () => {
      fireEvent.click(winBtn);
    });

    // BUG CONDITION: On unfixed code, updateMapPerformance IS called with { matches: 1 }
    // Expected behavior: it should NOT be called with { matches: 1 }
    const matchIncrementCalls = mockUpdateMapPerformance.mock.calls.filter(
      (call) => call[2]?.matches === 1
    );
    expect(matchIncrementCalls).toHaveLength(0);
  });

  it('handleRoundEnd should NOT call updateSitePerformance with { matches: 1 }', async () => {
    const Home = (await import('@/app/page')).default;

    await act(async () => {
      render(<Home />);
    });

    // Click "End Round" to reveal win/loss buttons
    const endRoundBtn = screen.getByRole('button', { name: /end round/i });
    await act(async () => {
      fireEvent.click(endRoundBtn);
    });

    // Click "Win" to trigger handleRoundEnd('win')
    const winBtn = screen.getByRole('button', { name: /^win$/i });
    await act(async () => {
      fireEvent.click(winBtn);
    });

    // BUG CONDITION: On unfixed code, updateSitePerformance IS called with { matches: 1 }
    // Expected behavior: it should NOT be called with { matches: 1 }
    const siteMatchIncrementCalls = mockUpdateSitePerformance.mock.calls.filter(
      (call) => call[3]?.matches === 1
    );
    expect(siteMatchIncrementCalls).toHaveLength(0);
  });
});
