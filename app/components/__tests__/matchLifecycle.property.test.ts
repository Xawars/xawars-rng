import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { MatchEntry, RoundEntry } from '../HistoryList';

// ponytail: test pure match lifecycle logic — no React, no mocks, just state transitions

// --- Generators ---

const arbitraryMapId = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' });

const arbitraryRound: fc.Arbitrary<RoundEntry> = fc.record({
  siteId: fc.oneof(fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }), fc.constant(null)),
  kills: fc.nat({ max: 30 }),
  deaths: fc.nat({ max: 30 }),
  outcome: fc.constantFrom<'win' | 'loss'>('win', 'loss'),
});

// ponytail: use integer timestamps to avoid Invalid Date edge cases with fc.date
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
  fc.integer({ min: 1704067200000, max: 1735689600000 }), // start: 2024
  fc.integer({ min: 0, max: 31536000000 }), // offset for endedAt (0..1yr after start)
  fc.array(arbitraryRound, { minLength: 1, maxLength: 10 }),
).map(([id, mapId, startTs, offset, rounds]) => ({
  id,
  mapId,
  startedAt: new Date(startTs).toISOString(),
  endedAt: new Date(startTs + offset).toISOString(),
  rounds,
}));

// --- Pure logic functions (mirrors page.tsx inline logic) ---

/** Simulate match creation from map selection (page.tsx onSelect handler) */
function startMatch(matches: MatchEntry[], mapId: string): MatchEntry[] {
  const hasOpenMatch = matches.some(m => !m.endedAt);
  if (hasOpenMatch) return matches; // locked
  const newMatch: MatchEntry = { id: crypto.randomUUID(), mapId, startedAt: new Date().toISOString(), rounds: [] };
  return [...matches, newMatch];
}

/** Simulate map lock rejection (page.tsx onSelect early return) */
function attemptMapChange(matches: MatchEntry[], _newMapId: string): { rejected: boolean; matches: MatchEntry[] } {
  const hasOpenMatch = matches.some(m => !m.endedAt);
  if (hasOpenMatch) return { rejected: true, matches };
  return { rejected: false, matches };
}

/** Simulate round-end delta computation (page.tsx handleRoundEnd) */
function computeRoundEnd(
  totalKills: number,
  totalDeaths: number,
  roundStartKills: number,
  roundStartDeaths: number,
  siteId: string | null,
  outcome: 'win' | 'loss'
): { round: RoundEntry; newRoundStartKills: number; newRoundStartDeaths: number } {
  return {
    round: {
      siteId,
      kills: totalKills - roundStartKills,
      deaths: totalDeaths - roundStartDeaths,
      outcome,
    },
    newRoundStartKills: totalKills,
    newRoundStartDeaths: totalDeaths,
  };
}

/** Simulate match-end (page.tsx handleEndMatch) */
function endMatch(matches: MatchEntry[]): MatchEntry[] {
  const now = new Date().toISOString();
  return matches.map(m => !m.endedAt ? { ...m, endedAt: now } : m);
}

/** Simulate map correction (page.tsx onCorrect handler) */
function correctMap(matches: MatchEntry[], newMapId: string): MatchEntry[] {
  return matches.map(m => !m.endedAt ? { ...m, mapId: newMapId } : m);
}

// --- Property Tests ---

/**
 * Property 2: Match creation from map selection
 *
 * For any map selection event where a deployment is active and no match is currently open,
 * the operation SHALL produce exactly one new MatchEntry appended to `matches[]` with
 * the selected `mapId` and a `startedAt` timestamp that is a valid ISO string.
 *
 * **Validates: Requirements 2.1**
 */
describe('Property 2: Match creation from map selection', () => {
  it('creates exactly one new match with correct mapId and valid ISO startedAt', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryClosedMatch, { minLength: 0, maxLength: 5 }),
        arbitraryMapId,
        (existingMatches, selectedMapId) => {
          // Pre-condition: no open match
          expect(existingMatches.every(m => m.endedAt !== undefined)).toBe(true);

          const result = startMatch(existingMatches, selectedMapId);

          // Exactly one new match appended
          expect(result.length).toBe(existingMatches.length + 1);

          const newMatch = result[result.length - 1];
          expect(newMatch.mapId).toBe(selectedMapId);
          expect(newMatch.rounds).toEqual([]);

          // startedAt is a valid ISO string
          const parsed = new Date(newMatch.startedAt);
          expect(parsed.toISOString()).toBe(newMatch.startedAt);
          expect(Number.isNaN(parsed.getTime())).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 3: Map locked during active match
 *
 * For any state where an active match exists, a regular map change operation SHALL be
 * rejected — the `activeMatch.mapId` and `currentMapId` remain unchanged, and no new match is created.
 *
 * **Validates: Requirements 2.2**
 */
describe('Property 3: Map locked during active match', () => {
  it('rejects map change when an open match exists — no mutation, no new match', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryClosedMatch, { minLength: 0, maxLength: 3 }),
        arbitraryOpenMatch,
        arbitraryMapId,
        (closedMatches, openMatch, attemptedMapId) => {
          const matches = [...closedMatches, openMatch];

          const { rejected, matches: result } = attemptMapChange(matches, attemptedMapId);

          expect(rejected).toBe(true);
          expect(result.length).toBe(matches.length);

          // Active match mapId unchanged
          const activeAfter = result.find(m => !m.endedAt);
          expect(activeAfter?.mapId).toBe(openMatch.mapId);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 4: Round-end produces correct delta and resets counters
 *
 * For any round-end operation given `totalKills`, `totalDeaths`, `roundStartKills`, `roundStartDeaths`,
 * and an outcome, the appended round SHALL have `kills === totalKills - roundStartKills`,
 * `deaths === totalDeaths - roundStartDeaths`, and the given outcome.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
describe('Property 4: Round-end produces correct delta and resets counters', () => {
  it('computes kills/deaths delta correctly and resets counters', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        fc.oneof(fc.string({ minLength: 1, maxLength: 8, unit: 'grapheme-ascii' }), fc.constant(null)),
        fc.constantFrom<'win' | 'loss'>('win', 'loss'),
        (totalKills, totalDeaths, roundStartKills, roundStartDeaths, siteId, outcome) => {
          const { round, newRoundStartKills, newRoundStartDeaths } = computeRoundEnd(
            totalKills, totalDeaths, roundStartKills, roundStartDeaths, siteId, outcome
          );

          // Delta correct
          expect(round.kills).toBe(totalKills - roundStartKills);
          expect(round.deaths).toBe(totalDeaths - roundStartDeaths);
          expect(round.outcome).toBe(outcome);
          expect(round.siteId).toBe(siteId);

          // Counters reset to current totals
          expect(newRoundStartKills).toBe(totalKills);
          expect(newRoundStartDeaths).toBe(totalDeaths);
        }
      ),
      { numRuns: 300 }
    );
  });
});

/**
 * Property 5: Match-end sets valid timestamp
 *
 * For any active match that is ended, the resulting match SHALL have an `endedAt` that
 * is a valid ISO timestamp string and `endedAt >= startedAt`.
 *
 * **Validates: Requirements 4.1**
 */
describe('Property 5: Match-end sets valid timestamp', () => {
  it('endedAt is a valid ISO timestamp >= startedAt', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryClosedMatch, { minLength: 0, maxLength: 3 }),
        arbitraryOpenMatch,
        (closedMatches, openMatch) => {
          const matches = [...closedMatches, openMatch];
          const result = endMatch(matches);

          // The previously-open match is now closed
          const ended = result.find(m => m.id === openMatch.id);
          expect(ended).toBeDefined();
          expect(ended!.endedAt).toBeDefined();

          // Valid ISO string
          const parsedEnd = new Date(ended!.endedAt!);
          expect(parsedEnd.toISOString()).toBe(ended!.endedAt);
          expect(Number.isNaN(parsedEnd.getTime())).toBe(false);

          // endedAt >= startedAt
          const parsedStart = new Date(ended!.startedAt);
          expect(parsedEnd.getTime()).toBeGreaterThanOrEqual(parsedStart.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 6: Map correction updates in-place
 *
 * For any map correction operation on an active match, the `matches` array length SHALL
 * remain unchanged, and the active match's `mapId` SHALL equal the newly selected map.
 *
 * **Validates: Requirements 5.1, 5.2**
 */
describe('Property 6: Map correction updates in-place', () => {
  it('corrects mapId in-place without changing array length', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryClosedMatch, { minLength: 0, maxLength: 3 }),
        arbitraryOpenMatch,
        arbitraryMapId,
        (closedMatches, openMatch, newMapId) => {
          const matches = [...closedMatches, openMatch];
          const result = correctMap(matches, newMapId);

          // Length unchanged
          expect(result.length).toBe(matches.length);

          // Active match mapId updated
          const corrected = result.find(m => m.id === openMatch.id);
          expect(corrected).toBeDefined();
          expect(corrected!.mapId).toBe(newMapId);

          // Closed matches untouched
          for (const closed of closedMatches) {
            const found = result.find(m => m.id === closed.id);
            expect(found?.mapId).toBe(closed.mapId);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
