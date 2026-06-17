/**
 * Match Lifecycle Integration Test
 *
 * Validates: Requirements 2.3, 2.4, 3.2
 *
 * Full end-to-end: start match → play 3 rounds on 2 distinct sites → end match
 * Asserts match counter increments happen ONLY at match-end, not per-round,
 * and that distinct sites get exactly 1 match increment each (no duplicates).
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

vi.mock('@/app/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  isGuestMode: () => false,
  clearGuestMode: vi.fn(),
}));

vi.mock('@/app/components/onboarding', () => ({
  TacticalEntry: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WelcomeModal: () => null,
  FirstActionTooltip: () => null,
}));

vi.mock('@/app/components/account', () => ({
  AccountIndicator: () => null,
  SetCallsignModal: () => null,
  shouldPromptCallsign: () => false,
}));

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

const TEST_DEPLOYMENT_ID = 'test-deployment-lifecycle';

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
        id: 'match-lifecycle-001',
        mapId: 'clubhouse',
        startedAt: new Date().toISOString(),
        rounds: [],
      },
    ],
  },
];

// Site IDs from Clubhouse map data
const SITE_CCTV = 'cash-cctv';
const SITE_CHURCH = 'church-arsenal';

describe('Match Lifecycle Integration: 3 rounds → end match', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    localStorage.setItem('xawars_currentOperator', JSON.stringify(TEST_OPERATOR));
    localStorage.setItem('xawars_currentDeploymentId', JSON.stringify(TEST_DEPLOYMENT_ID));
    localStorage.setItem('xawars_history', JSON.stringify(TEST_HISTORY));
    localStorage.setItem('xawars_currentMapId', JSON.stringify('clubhouse'));
    localStorage.setItem('xawars_currentSiteId', JSON.stringify(SITE_CCTV));
    localStorage.setItem('xawars_kills', JSON.stringify(0));
    localStorage.setItem('xawars_deaths', JSON.stringify(0));
  });

  it('increments map match count once and each distinct site once after match-end, not during rounds', { timeout: 15000 }, async () => {
    const Home = (await import('@/app/page')).default;

    await act(async () => {
      render(<Home />);
    });

    // --- Round 1: site = CCTV, outcome = win ---
    // Site is already set to CCTV via localStorage
    let endRoundBtn = screen.getByRole('button', { name: /end round/i });
    await act(async () => { fireEvent.click(endRoundBtn); });
    let winBtn = screen.getByRole('button', { name: /^win$/i });
    await act(async () => { fireEvent.click(winBtn); });

    // After round 1: no match increment should have happened
    const matchCallsAfterRound1 = mockUpdateMapPerformance.mock.calls.filter(
      (call) => call[2]?.matches === 1
    );
    expect(matchCallsAfterRound1).toHaveLength(0);

    // --- Round 2: site = Church, outcome = win ---
    // After round end, currentSiteId is cleared. Pick Church via the site selector UI.
    const churchBtn = screen.getByRole('button', { name: /church/i });
    await act(async () => { fireEvent.click(churchBtn); });

    endRoundBtn = screen.getByRole('button', { name: /end round/i });
    await act(async () => { fireEvent.click(endRoundBtn); });
    winBtn = screen.getByRole('button', { name: /^win$/i });
    await act(async () => { fireEvent.click(winBtn); });

    // After round 2: still no match increment
    const matchCallsAfterRound2 = mockUpdateMapPerformance.mock.calls.filter(
      (call) => call[2]?.matches === 1
    );
    expect(matchCallsAfterRound2).toHaveLength(0);

    // --- Round 3: site = CCTV again, outcome = loss ---
    const cctvBtn = screen.getByRole('button', { name: /cctv/i });
    await act(async () => { fireEvent.click(cctvBtn); });

    endRoundBtn = screen.getByRole('button', { name: /end round/i });
    await act(async () => { fireEvent.click(endRoundBtn); });
    const lossBtn = screen.getByRole('button', { name: /^loss$/i });
    await act(async () => { fireEvent.click(lossBtn); });

    // After round 3: still no match increment
    const matchCallsAfterRound3 = mockUpdateMapPerformance.mock.calls.filter(
      (call) => call[2]?.matches === 1
    );
    expect(matchCallsAfterRound3).toHaveLength(0);

    // --- End Match ---
    const endMatchBtn = screen.getByRole('button', { name: /end match/i });
    await act(async () => { fireEvent.click(endMatchBtn); });

    // After match-end: map match count incremented exactly once for 'clubhouse'
    const mapMatchCalls = mockUpdateMapPerformance.mock.calls.filter(
      (call) => call[1] === 'clubhouse' && call[2]?.matches === 1
    );
    expect(mapMatchCalls).toHaveLength(1);

    // After match-end: site match count = 1 for CCTV (despite appearing in 2 rounds)
    const cctvSiteCalls = mockUpdateSitePerformance.mock.calls.filter(
      (call) => call[2] === SITE_CCTV && call[3]?.matches === 1
    );
    expect(cctvSiteCalls).toHaveLength(1);

    // After match-end: site match count = 1 for Church
    const churchSiteCalls = mockUpdateSitePerformance.mock.calls.filter(
      (call) => call[2] === SITE_CHURCH && call[3]?.matches === 1
    );
    expect(churchSiteCalls).toHaveLength(1);

    // No other site match increments happened (total distinct sites = 2)
    const allSiteMatchCalls = mockUpdateSitePerformance.mock.calls.filter(
      (call) => call[3]?.matches === 1
    );
    expect(allSiteMatchCalls).toHaveLength(2);
  });
});
