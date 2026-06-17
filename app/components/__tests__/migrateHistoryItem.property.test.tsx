import fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import type { HistoryItem, LegacyRoundEntry } from '../HistoryList';
import type { Operator, Loadout, Side } from '../../data/types';

// ponytail: mock everything page.tsx touches so we can import the pure function
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, session: null, isGuest: false }) }));
vi.mock('../../context/DataContext', () => ({ useData: () => ({ addDeployment: vi.fn(), deleteDeployment: vi.fn(), clearDeployments: vi.fn(), updateMapPerformance: vi.fn(), updateMapWinLoss: vi.fn(), updateSitePerformance: vi.fn() }) }));
vi.mock('../onboarding/OnboardingProvider', () => ({ useOnboardingContext: () => ({ markFirstRoll: vi.fn() }) }));
vi.mock('../onboarding', () => ({ TacticalEntry: ({ children }: any) => children, WelcomeModal: () => null, FirstActionTooltip: () => null }));
vi.mock('../account', () => ({ AccountIndicator: () => null, SetCallsignModal: () => null, shouldPromptCallsign: () => false }));
vi.mock('../auth/ProtectedRoute', () => ({ ProtectedRoute: ({ children }: any) => children, isGuestMode: () => false, clearGuestMode: vi.fn() }));

import { migrateHistoryItem } from '../../page';

// --- Generators ---

const arbitraryOperator: fc.Arbitrary<Operator> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
  name: fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
  side: fc.constantFrom<Side>('attacker', 'defender'),
  primaries: fc.array(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), { minLength: 1, maxLength: 3 }),
  secondaries: fc.array(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), { minLength: 1, maxLength: 3 }),
  gadgets: fc.array(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), { minLength: 1, maxLength: 3 }),
  roles: fc.array(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), { minLength: 0, maxLength: 2 }),
});

const arbitraryLoadout: fc.Arbitrary<Loadout> = fc.record({
  primary: fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
  secondary: fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
  gadget: fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
});

const arbitraryLegacyRound: fc.Arbitrary<LegacyRoundEntry> = fc.record({
  mapId: fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
  siteId: fc.oneof(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), fc.constant(null)),
  kills: fc.nat({ max: 50 }),
  deaths: fc.nat({ max: 50 }),
  outcome: fc.constantFrom<'win' | 'loss'>('win', 'loss'),
});

/** Old-format HistoryItem with flat rounds[] (no matches, no schemaVersion) */
const arbitraryOldHistoryItem: fc.Arbitrary<HistoryItem> = fc.record({
  id: fc.nat({ max: 2000000000000 }),
  operator: arbitraryOperator,
  loadout: arbitraryLoadout,
  rounds: fc.array(arbitraryLegacyRound, { minLength: 1, maxLength: 20 }),
}).map(item => item as unknown as HistoryItem);

/** Old-format HistoryItem with NO rounds (fresh deployment, pre-migration) */
const arbitraryEmptyOldHistoryItem: fc.Arbitrary<HistoryItem> = fc.record({
  id: fc.nat({ max: 2000000000000 }),
  operator: arbitraryOperator,
  loadout: arbitraryLoadout,
}).map(item => item as unknown as HistoryItem);

// --- Property Tests ---

/**
 * Property 7: Legacy migration preserves all rounds
 *
 * For any old-format HistoryItem containing a `rounds` array of N entries,
 * migration SHALL produce exactly one MatchEntry with `mapId === null` and
 * a `rounds` array of length N, where each migrated round preserves the
 * original `siteId`, `kills`, `deaths`, and `outcome` values.
 *
 * **Validates: Requirements 6.2, 6.4**
 */
describe('Property 7: Legacy migration preserves all rounds', () => {
  it('migrates old rounds[] into exactly one legacy match preserving all round data', () => {
    fc.assert(
      fc.property(arbitraryOldHistoryItem, (oldItem) => {
        const result = migrateHistoryItem(oldItem);
        const inputRounds = (oldItem as any).rounds as LegacyRoundEntry[];

        // Must be schema version 2
        expect(result.schemaVersion).toBe(2);

        // Must have exactly one match
        expect(result.matches).toBeDefined();
        expect(result.matches!.length).toBe(1);

        const match = result.matches![0];

        // Legacy match has mapId === null
        expect(match.mapId).toBeNull();

        // Round count preserved
        expect(match.rounds.length).toBe(inputRounds.length);

        // Each round preserves siteId, kills, deaths, outcome
        for (let i = 0; i < inputRounds.length; i++) {
          expect(match.rounds[i].siteId).toBe(inputRounds[i].siteId);
          expect(match.rounds[i].kills).toBe(inputRounds[i].kills);
          expect(match.rounds[i].deaths).toBe(inputRounds[i].deaths);
          expect(match.rounds[i].outcome).toBe(inputRounds[i].outcome);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('no rounds and no matches → result has matches: [] and schemaVersion: 2', () => {
    fc.assert(
      fc.property(arbitraryEmptyOldHistoryItem, (oldItem) => {
        const result = migrateHistoryItem(oldItem);

        expect(result.schemaVersion).toBe(2);
        expect(result.matches).toBeDefined();
        expect(result.matches!.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
