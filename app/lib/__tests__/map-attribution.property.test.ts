import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { upsertMapPerformance } from '../map-performance';
import type { MapPerformanceRecord } from '../../types/database';

// --- Generators ---

/** Generates a short alphanumeric ID suitable for operatorId / mapId (no underscores) */
const idArb = fc
  .string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' })
  .filter((s) => /^[a-zA-Z0-9]+$/.test(s));

/** Generates a small set of map IDs (realistic pool size) */
const mapPoolArb = fc.array(idArb, { minLength: 1, maxLength: 6 }).map((ids) => [...new Set(ids)]).filter((ids) => ids.length >= 1);

/** Action types for simulating user behavior */
type Action =
  | { type: 'selectMap'; mapId: string | null }
  | { type: 'incrementKill' }
  | { type: 'incrementDeath' };

/** Generates a sequence of user actions (map selections + kill/death increments) */
function actionSequenceArb(mapIds: string[]): fc.Arbitrary<Action[]> {
  const selectMapAction: fc.Arbitrary<Action> = fc.oneof(
    fc.constantFrom(...mapIds).map((mapId) => ({ type: 'selectMap' as const, mapId })),
    fc.constant({ type: 'selectMap' as const, mapId: null })
  );
  const incrementKillAction: fc.Arbitrary<Action> = fc.constant({ type: 'incrementKill' as const });
  const incrementDeathAction: fc.Arbitrary<Action> = fc.constant({ type: 'incrementDeath' as const });

  return fc.array(
    fc.oneof(
      { weight: 2, arbitrary: selectMapAction },
      { weight: 3, arbitrary: incrementKillAction },
      { weight: 3, arbitrary: incrementDeathAction }
    ),
    { minLength: 1, maxLength: 40 }
  );
}

/** Generates a sequence of map selections (including null) for match count testing */
function mapSelectionSequenceArb(mapIds: string[]): fc.Arbitrary<(string | null)[]> {
  return fc.array(
    fc.oneof(
      fc.constantFrom(...mapIds),
      fc.constant(null as string | null)
    ),
    { minLength: 2, maxLength: 30 }
  );
}

// --- Property Tests ---

/**
 * Feature: map-performance-tracking, Property 1: Attribution follows current selection
 *
 * For any sequence of map selections and kill/death increments during a deployment,
 * each increment SHALL be attributed to the map that was selected at the time of the
 * increment (or no map if the placeholder was selected), and previously recorded
 * increments SHALL remain unchanged.
 *
 * **Validates: Requirements 1.3, 1.4, 1.5**
 */
describe('Feature: map-performance-tracking, Property 1: Attribution follows current selection', () => {
  it('increments attributed to currently selected map', () => {
    fc.assert(
      fc.property(
        idArb,
        mapPoolArb.chain((mapIds) => fc.tuple(fc.constant(mapIds), actionSequenceArb(mapIds))),
        (operatorId, [mapIds, actions]) => {
          let records: Record<string, MapPerformanceRecord> = {};
          let currentMap: string | null = null;

          // Track expected kills and deaths per map
          const expectedKills: Record<string, number> = {};
          const expectedDeaths: Record<string, number> = {};

          for (const mapId of mapIds) {
            expectedKills[mapId] = 0;
            expectedDeaths[mapId] = 0;
          }

          // Simulate the action sequence
          for (const action of actions) {
            switch (action.type) {
              case 'selectMap':
                currentMap = action.mapId;
                break;
              case 'incrementKill':
                if (currentMap !== null) {
                  records = upsertMapPerformance(records, operatorId, currentMap, { kills: 1 });
                  expectedKills[currentMap] = (expectedKills[currentMap] ?? 0) + 1;
                }
                break;
              case 'incrementDeath':
                if (currentMap !== null) {
                  records = upsertMapPerformance(records, operatorId, currentMap, { deaths: 1 });
                  expectedDeaths[currentMap] = (expectedDeaths[currentMap] ?? 0) + 1;
                }
                break;
            }
          }

          // Assert: for each map that was selected during increments, its kills + deaths
          // in the final records equals the number of increments that occurred while
          // that map was selected
          for (const mapId of mapIds) {
            const key = `${operatorId}_${mapId}`;
            const record = records[key];

            if (expectedKills[mapId] === 0 && expectedDeaths[mapId] === 0) {
              // If no increments were attributed to this map, no record should exist
              // (unless it was created by some other means)
              if (record) {
                expect(record.kills).toBe(0);
                expect(record.deaths).toBe(0);
              }
            } else {
              // Record must exist and have the correct totals
              expect(record).toBeDefined();
              expect(record.kills).toBe(expectedKills[mapId]);
              expect(record.deaths).toBe(expectedDeaths[mapId]);
            }
          }

          // Additional check: total kills and deaths in all records equals
          // total increments that occurred while any map was selected
          const totalExpectedKills = Object.values(expectedKills).reduce((sum, v) => sum + v, 0);
          const totalExpectedDeaths = Object.values(expectedDeaths).reduce((sum, v) => sum + v, 0);

          let totalActualKills = 0;
          let totalActualDeaths = 0;
          for (const record of Object.values(records)) {
            totalActualKills += record.kills;
            totalActualDeaths += record.deaths;
          }

          expect(totalActualKills).toBe(totalExpectedKills);
          expect(totalActualDeaths).toBe(totalExpectedDeaths);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 5: Match count increments on map change
 *
 * For any sequence of map selection changes during a deployment, the match count for
 * each operator-map combination SHALL equal the number of times the user transitioned
 * away from that map to a different selection (including the placeholder).
 *
 * **Validates: Requirements 3.2**
 */
describe('Feature: map-performance-tracking, Property 5: Match count increments on map change', () => {
  it('match count equals number of transitions away from a map', () => {
    fc.assert(
      fc.property(
        idArb,
        mapPoolArb.chain((mapIds) => fc.tuple(fc.constant(mapIds), mapSelectionSequenceArb(mapIds))),
        (operatorId, [mapIds, selections]) => {
          let records: Record<string, MapPerformanceRecord> = {};

          // Track expected match counts per map
          const expectedMatches: Record<string, number> = {};
          for (const mapId of mapIds) {
            expectedMatches[mapId] = 0;
          }

          // Simulate map selection transitions
          let previousMap: string | null = null;

          for (const selection of selections) {
            // A transition occurs when moving FROM a non-null map TO a different selection
            if (previousMap !== null && selection !== previousMap) {
              // Increment match count for the map we're leaving
              records = upsertMapPerformance(records, operatorId, previousMap, { matches: 1 });
              expectedMatches[previousMap] = (expectedMatches[previousMap] ?? 0) + 1;
            }
            previousMap = selection;
          }

          // Assert: final match count for each map equals number of transitions away
          for (const mapId of mapIds) {
            const key = `${operatorId}_${mapId}`;
            const record = records[key];

            if (expectedMatches[mapId] === 0) {
              // No transitions away from this map — record may not exist
              if (record) {
                expect(record.matches).toBe(0);
              }
            } else {
              expect(record).toBeDefined();
              expect(record.matches).toBe(expectedMatches[mapId]);
            }
          }

          // Additional check: total matches across all records equals total transitions
          const totalExpectedMatches = Object.values(expectedMatches).reduce((sum, v) => sum + v, 0);
          let totalActualMatches = 0;
          for (const record of Object.values(records)) {
            totalActualMatches += record.matches;
          }

          expect(totalActualMatches).toBe(totalExpectedMatches);
        }
      ),
      { numRuns: 100 }
    );
  });
});
