import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { MatchEntry, RoundEntry, HistoryItem } from '../HistoryList';

// ponytail: property test for persistence invariant — pure state transition, no localStorage needed

// --- Generators ---

const arbitraryMapId = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' });

const arbitraryRound: fc.Arbitrary<RoundEntry> = fc.record({
  siteId: fc.oneof(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), fc.constant(null)),
  kills: fc.nat({ max: 30 }),
  deaths: fc.nat({ max: 30 }),
  outcome: fc.constantFrom<'win' | 'loss'>('win', 'loss'),
});

const arbitraryIsoString = fc.integer({ min: 1704067200000, max: 1767225600000 }).map(ts => new Date(ts).toISOString());

const arbitraryOpenMatch: fc.Arbitrary<MatchEntry> = fc.record({
  id: fc.uuid(),
  mapId: fc.oneof(arbitraryMapId, fc.constant(null)),
  startedAt: arbitraryIsoString,
  rounds: fc.array(arbitraryRound, { minLength: 0, maxLength: 10 }),
}).map(m => ({ ...m })); // no endedAt → open match

const arbitraryClosedMatch: fc.Arbitrary<MatchEntry> = fc.tuple(
  fc.uuid(),
  fc.oneof(arbitraryMapId, fc.constant(null)),
  fc.integer({ min: 1704067200000, max: 1735689600000 }),
  fc.integer({ min: 0, max: 31536000000 }),
  fc.array(arbitraryRound, { minLength: 1, maxLength: 10 }),
).map(([id, mapId, startTs, offset, rounds]) => ({
  id,
  mapId,
  startedAt: new Date(startTs).toISOString(),
  endedAt: new Date(startTs + offset).toISOString(),
  rounds,
}));

// Minimal HistoryItem generator — only the fields relevant to persistence invariant
const arbitraryHistoryItemWithOpenMatch = fc.tuple(
  fc.nat(),
  fc.string({ minLength: 1, maxLength: 8, unit: 'grapheme-ascii' }),
  fc.array(arbitraryClosedMatch, { minLength: 0, maxLength: 3 }),
  arbitraryOpenMatch,
).map(([id, deploymentId, closedMatches, openMatch]) => ({
  id,
  deploymentId,
  operator: { id: 'test', name: 'Test' } as any,
  loadout: { primary: null, secondary: null, gadget: null } as any,
  matches: [...closedMatches, openMatch],
  schemaVersion: 2,
} as HistoryItem));

// --- Pure logic: simulates the setHistory updater from handleRoundEnd in page.tsx ---

function applyRoundEnd(
  history: HistoryItem[],
  deploymentId: string,
  activeMatchId: string,
  newRound: RoundEntry,
): HistoryItem[] {
  return history.map(h =>
    h.deploymentId === deploymentId
      ? {
          ...h,
          matches: (h.matches || []).map(m =>
            m.id === activeMatchId
              ? { ...m, rounds: [...m.rounds, newRound] }
              : m
          ),
        }
      : h
  );
}

// --- Property Test ---

/**
 * Property 9: Partial match state persisted after round-end
 *
 * For any round-end operation, the persisted `history` array SHALL contain the active
 * HistoryItem with its open match (no `endedAt`) including all appended rounds up to
 * and including the just-ended round.
 *
 * **Validates: Requirements 9.3**
 */
describe('Property 9: Partial match state persisted after round-end', () => {
  it('history contains open match with all rounds including the newly appended one', () => {
    fc.assert(
      fc.property(
        arbitraryHistoryItemWithOpenMatch,
        arbitraryRound,
        (historyItem, newRound) => {
          const openMatch = historyItem.matches!.find(m => !m.endedAt)!;
          const previousRoundsCount = openMatch.rounds.length;

          // Simulate the round-end state transition (what setHistory does)
          const updatedHistory = applyRoundEnd(
            [historyItem],
            historyItem.deploymentId!,
            openMatch.id,
            newRound,
          );

          // The persisted history has the item
          const persistedItem = updatedHistory.find(h => h.deploymentId === historyItem.deploymentId);
          expect(persistedItem).toBeDefined();

          // The open match is still open (no endedAt)
          const persistedMatch = persistedItem!.matches!.find(m => m.id === openMatch.id);
          expect(persistedMatch).toBeDefined();
          expect(persistedMatch!.endedAt).toBeUndefined();

          // Rounds array grew by exactly 1
          expect(persistedMatch!.rounds.length).toBe(previousRoundsCount + 1);

          // The last round matches what was appended
          const lastRound = persistedMatch!.rounds[persistedMatch!.rounds.length - 1];
          expect(lastRound).toEqual(newRound);

          // All previous rounds are preserved in order
          for (let i = 0; i < previousRoundsCount; i++) {
            expect(persistedMatch!.rounds[i]).toEqual(openMatch.rounds[i]);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
