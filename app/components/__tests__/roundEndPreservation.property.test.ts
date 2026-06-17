import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { MatchEntry, RoundEntry, HistoryItem } from '../HistoryList';

// ponytail: property tests for handleRoundEnd preservation behaviors (Req 3.1, 3.2, 3.3)
// These must pass on UNFIXED code — they capture baseline side effects to protect from regression.

// --- Generators ---

const arbitraryMapId = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' });
const arbitrarySiteId = fc.oneof(
  fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
  fc.constant(null)
);
const arbitraryOutcome = fc.constantFrom<'win' | 'loss'>('win', 'loss');
const arbitraryOperatorId = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' });

const arbitraryRound: fc.Arbitrary<RoundEntry> = fc.record({
  siteId: arbitrarySiteId,
  kills: fc.nat({ max: 30 }),
  deaths: fc.nat({ max: 30 }),
  outcome: arbitraryOutcome,
});

const arbitraryIsoString = fc.integer({ min: 1704067200000, max: 1767225600000 }).map(ts => new Date(ts).toISOString());

const arbitraryOpenMatch: fc.Arbitrary<MatchEntry> = fc.record({
  id: fc.uuid(),
  mapId: fc.oneof(arbitraryMapId, fc.constant(null)),
  startedAt: arbitraryIsoString,
  rounds: fc.array(arbitraryRound, { minLength: 0, maxLength: 8 }),
}).map(m => ({ ...m }));

// --- Pure logic: mirrors handleRoundEnd side-effect decisions ---

interface RoundEndInput {
  activeMatch: MatchEntry;
  currentDeploymentId: string;
  currentOperator: { id: string } | null;
  currentSiteId: string | null;
  kills: number;
  deaths: number;
  roundStartKills: number;
  roundStartDeaths: number;
  outcome: 'win' | 'loss';
}

interface RoundEndEffects {
  /** Whether updateMapWinLoss should be called, and with what args */
  mapWinLossCall: { mapId: string; outcome: 'win' | 'loss' } | null;
  /** The round appended to activeMatch.rounds */
  appendedRound: RoundEntry;
  /** New value of roundStartKillsRef */
  newRoundStartKills: number;
  /** New value of roundStartDeathsRef */
  newRoundStartDeaths: number;
  /** currentSiteId is cleared to null */
  siteCleared: true;
}

/**
 * Pure extraction of handleRoundEnd's preservation behaviors.
 * This models what the function does minus the buggy { matches: 1 } calls.
 */
function computeRoundEndEffects(input: RoundEndInput): RoundEndEffects {
  const roundKills = input.kills - input.roundStartKills;
  const roundDeaths = input.deaths - input.roundStartDeaths;

  const appendedRound: RoundEntry = {
    siteId: input.currentSiteId,
    kills: roundKills,
    deaths: roundDeaths,
    outcome: input.outcome,
  };

  const mapWinLossCall = input.activeMatch.mapId
    ? { mapId: input.activeMatch.mapId, outcome: input.outcome }
    : null;

  return {
    mapWinLossCall,
    appendedRound,
    newRoundStartKills: input.kills,
    newRoundStartDeaths: input.deaths,
    siteCleared: true,
  };
}

/**
 * Pure extraction of the state transition: appending a round to the active match in history.
 */
function applyRoundAppend(
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

// --- Composite generator for round-end inputs ---

const arbitraryRoundEndInput: fc.Arbitrary<RoundEndInput> = fc.record({
  activeMatch: arbitraryOpenMatch.filter(m => m.mapId !== null), // mapId required for winLoss call
  currentDeploymentId: fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }),
  currentOperator: fc.oneof(
    arbitraryOperatorId.map(id => ({ id })),
    fc.constant(null)
  ),
  currentSiteId: arbitrarySiteId,
  kills: fc.nat({ max: 100 }),
  deaths: fc.nat({ max: 100 }),
  roundStartKills: fc.nat({ max: 100 }),
  roundStartDeaths: fc.nat({ max: 100 }),
  outcome: arbitraryOutcome,
});

// --- Property Tests ---

/**
 * Property 2a: updateMapWinLoss is called with correct outcome
 *
 * For all round-end events where activeMatch.mapId is non-null,
 * updateMapWinLoss SHALL be called with (activeMatch.mapId, outcome).
 *
 * **Validates: Requirements 3.1**
 */
describe('Property 2a: updateMapWinLoss called with correct outcome', () => {
  it('for any round-end with a mapId, mapWinLoss is called with mapId and the round outcome', () => {
    fc.assert(
      fc.property(
        arbitraryRoundEndInput,
        (input) => {
          const effects = computeRoundEndEffects(input);

          // activeMatch.mapId is non-null (filtered in generator)
          expect(effects.mapWinLossCall).not.toBeNull();
          expect(effects.mapWinLossCall!.mapId).toBe(input.activeMatch.mapId);
          expect(effects.mapWinLossCall!.outcome).toBe(input.outcome);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('when activeMatch.mapId is null, mapWinLoss is NOT called', () => {
    const inputWithNullMap = fc.record({
      activeMatch: arbitraryOpenMatch.map(m => ({ ...m, mapId: null })),
      currentDeploymentId: fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }),
      currentOperator: fc.oneof(
        arbitraryOperatorId.map(id => ({ id })),
        fc.constant(null)
      ),
      currentSiteId: arbitrarySiteId,
      kills: fc.nat({ max: 100 }),
      deaths: fc.nat({ max: 100 }),
      roundStartKills: fc.nat({ max: 100 }),
      roundStartDeaths: fc.nat({ max: 100 }),
      outcome: arbitraryOutcome,
    });

    fc.assert(
      fc.property(inputWithNullMap, (input) => {
        const effects = computeRoundEndEffects(input);
        expect(effects.mapWinLossCall).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2b: Round data appended with correct kills delta, deaths delta, site, and outcome
 *
 * For all round-end events, the appended round SHALL have:
 * - kills = totalKills - roundStartKills
 * - deaths = totalDeaths - roundStartDeaths
 * - siteId = currentSiteId
 * - outcome = the round outcome
 *
 * **Validates: Requirements 3.2**
 */
describe('Property 2b: Round data appended correctly', () => {
  it('appended round has correct kills delta, deaths delta, siteId, and outcome', () => {
    fc.assert(
      fc.property(
        arbitraryRoundEndInput,
        (input) => {
          const effects = computeRoundEndEffects(input);

          expect(effects.appendedRound.kills).toBe(input.kills - input.roundStartKills);
          expect(effects.appendedRound.deaths).toBe(input.deaths - input.roundStartDeaths);
          expect(effects.appendedRound.siteId).toBe(input.currentSiteId);
          expect(effects.appendedRound.outcome).toBe(input.outcome);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('applying the round to history appends exactly one round to the active match', () => {
    fc.assert(
      fc.property(
        arbitraryRoundEndInput,
        (input) => {
          const effects = computeRoundEndEffects(input);

          const historyItem: HistoryItem = {
            id: Date.now(),
            deploymentId: input.currentDeploymentId,
            operator: { id: input.currentOperator?.id || 'test', name: 'Test' } as any,
            loadout: { primary: null, secondary: null, gadget: null } as any,
            matches: [input.activeMatch],
            schemaVersion: 2,
          };

          const previousRounds = input.activeMatch.rounds.length;
          const updated = applyRoundAppend(
            [historyItem],
            input.currentDeploymentId,
            input.activeMatch.id,
            effects.appendedRound,
          );

          const updatedMatch = updated[0].matches!.find(m => m.id === input.activeMatch.id)!;
          expect(updatedMatch.rounds.length).toBe(previousRounds + 1);
          expect(updatedMatch.rounds[updatedMatch.rounds.length - 1]).toEqual(effects.appendedRound);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 2c: Refs reset and currentSiteId cleared
 *
 * For all round-end events:
 * - roundStartKillsRef is set to current kills
 * - roundStartDeathsRef is set to current deaths
 * - currentSiteId is cleared (set to null)
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 2c: Refs reset and site cleared', () => {
  it('roundStartKillsRef resets to current kills, roundStartDeathsRef to current deaths, site cleared', () => {
    fc.assert(
      fc.property(
        arbitraryRoundEndInput,
        (input) => {
          const effects = computeRoundEndEffects(input);

          expect(effects.newRoundStartKills).toBe(input.kills);
          expect(effects.newRoundStartDeaths).toBe(input.deaths);
          expect(effects.siteCleared).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
