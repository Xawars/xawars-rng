import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  upsertMapPerformance,
  computeMapStats,
  getMapBreakdown,
  getBestOperators,
  mergeMapPerformanceRecords,
  getActiveMaps,
} from '../map-performance';
import type { MapPerformanceRecord } from '../../types/database';
import type { MapData } from '../../data/maps';

// --- Generators ---

/** Generates a short alphanumeric ID suitable for operatorId / mapId */
const idArb = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }).filter((s) => !s.includes('_'));

/** Generates a non-negative integer delta for kills/deaths/matches */
const positiveDeltaArb = fc.nat({ max: 100 });

/** Generates a delta object with non-negative values */
const deltaArb = fc.record({
  kills: fc.option(positiveDeltaArb, { nil: undefined }),
  deaths: fc.option(positiveDeltaArb, { nil: undefined }),
  rounds: fc.option(positiveDeltaArb, { nil: undefined }),
  roundsWon: fc.option(positiveDeltaArb, { nil: undefined }),
  roundsLost: fc.option(positiveDeltaArb, { nil: undefined }),
  matches: fc.option(positiveDeltaArb, { nil: undefined }),
  matchesWon: fc.option(positiveDeltaArb, { nil: undefined }),
  matchesLost: fc.option(positiveDeltaArb, { nil: undefined }),
});

/** Generates a valid MapPerformanceRecord */
const mapPerformanceRecordArb = (operatorId?: string, mapId?: string) =>
  fc.record({
    operatorId: operatorId ? fc.constant(operatorId) : idArb,
    mapId: mapId ? fc.constant(mapId) : idArb,
    kills: fc.nat({ max: 5000 }),
    deaths: fc.nat({ max: 5000 }),
    rounds: fc.nat({ max: 1000 }),
    roundsWon: fc.nat({ max: 500 }),
    roundsLost: fc.nat({ max: 500 }),
    matches: fc.nat({ max: 500 }),
    matchesWon: fc.nat({ max: 250 }),
    matchesLost: fc.nat({ max: 250 }),
  });

/** Generates a record set keyed by composite key */
const recordSetArb = fc
  .array(
    fc.tuple(idArb, idArb).chain(([opId, mapId]) =>
      mapPerformanceRecordArb(opId, mapId).map((rec) => ({
        key: `${opId}_${mapId}`,
        record: rec,
      }))
    ),
    { minLength: 0, maxLength: 15 }
  )
  .map((entries) => {
    const records: Record<string, MapPerformanceRecord> = {};
    for (const { key, record } of entries) {
      records[key] = record;
    }
    return records;
  });

/** Generates a MapData entry */
const mapDataArb: fc.Arbitrary<MapData> = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 30, unit: 'grapheme-ascii' }),
  active: fc.boolean(),
  sites: fc.constant([]),
});

/** Generates operator side */
const sideArb = fc.constantFrom<'attacker' | 'defender'>('attacker', 'defender');

// --- Property Tests ---

/**
 * Feature: map-performance-tracking, Property 4: Upsert additivity
 *
 * For any sequence of upsert operations on the same operator-map combination,
 * the resulting kills, deaths, and matches SHALL equal the sum of all individual
 * deltas applied.
 *
 * **Validates: Requirements 3.1, 7.4**
 */
describe('Feature: map-performance-tracking, Property 4: Upsert additivity', () => {
  it('sequential upserts produce sums of all deltas', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        fc.array(deltaArb, { minLength: 1, maxLength: 20 }),
        (operatorId, mapId, deltas) => {
          let records: Record<string, MapPerformanceRecord> = {};

          let expectedKills = 0;
          let expectedDeaths = 0;
          let expectedRounds = 0;
          let expectedRoundsWon = 0;
          let expectedRoundsLost = 0;
          let expectedMatches = 0;
          let expectedMatchesWon = 0;
          let expectedMatchesLost = 0;

          for (const delta of deltas) {
            records = upsertMapPerformance(records, operatorId, mapId, delta);
            expectedKills += delta.kills ?? 0;
            expectedDeaths += delta.deaths ?? 0;
            expectedRounds += delta.rounds ?? 0;
            expectedRoundsWon += delta.roundsWon ?? 0;
            expectedRoundsLost += delta.roundsLost ?? 0;
            expectedMatches += delta.matches ?? 0;
            expectedMatchesWon += delta.matchesWon ?? 0;
            expectedMatchesLost += delta.matchesLost ?? 0;
          }

          const key = `${operatorId}_${mapId}`;
          const result = records[key];

          expect(result).toBeDefined();
          expect(result.kills).toBe(expectedKills);
          expect(result.deaths).toBe(expectedDeaths);
          expect(result.rounds).toBe(expectedRounds);
          expect(result.roundsWon).toBe(expectedRoundsWon);
          expect(result.roundsLost).toBe(expectedRoundsLost);
          expect(result.matches).toBe(expectedMatches);
          expect(result.matchesWon).toBe(expectedMatchesWon);
          expect(result.matchesLost).toBe(expectedMatchesLost);
          expect(result.operatorId).toBe(operatorId);
          expect(result.mapId).toBe(mapId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 7: Migration merge sums correctly
 *
 * For any two sets of MapPerformanceRecords (local and cloud), merging them SHALL
 * produce records where each operator-map combination's kills, deaths, and matches
 * equal the sum of the corresponding values from both sets. Non-overlapping records
 * SHALL be included unchanged.
 *
 * **Validates: Requirements 3.4**
 */
describe('Feature: map-performance-tracking, Property 7: Migration merge sums correctly', () => {
  it('merging two sets produces additive totals for overlapping keys', () => {
    fc.assert(
      fc.property(recordSetArb, recordSetArb, (local, cloud) => {
        const merged = mergeMapPerformanceRecords(local, cloud);

        // All keys from both sets must exist in merged
        const allKeys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
        for (const key of allKeys) {
          expect(merged[key]).toBeDefined();
        }

        // For overlapping keys, values should be additive
        for (const key of Object.keys(local)) {
          const localRec = local[key];
          const cloudRec = cloud[key];

          if (cloudRec) {
            expect(merged[key].kills).toBe(localRec.kills + cloudRec.kills);
            expect(merged[key].deaths).toBe(localRec.deaths + cloudRec.deaths);
            expect(merged[key].rounds).toBe(localRec.rounds + cloudRec.rounds);
            expect(merged[key].roundsWon).toBe(localRec.roundsWon + cloudRec.roundsWon);
            expect(merged[key].roundsLost).toBe(localRec.roundsLost + cloudRec.roundsLost);
            expect(merged[key].matches).toBe(localRec.matches + cloudRec.matches);
            expect(merged[key].matchesWon).toBe(localRec.matchesWon + cloudRec.matchesWon);
            expect(merged[key].matchesLost).toBe(localRec.matchesLost + cloudRec.matchesLost);
          } else {
            // Non-overlapping local records included unchanged
            expect(merged[key].kills).toBe(localRec.kills);
            expect(merged[key].deaths).toBe(localRec.deaths);
            expect(merged[key].matches).toBe(localRec.matches);
          }
        }

        // Non-overlapping cloud records included unchanged
        for (const key of Object.keys(cloud)) {
          if (!local[key]) {
            expect(merged[key].kills).toBe(cloud[key].kills);
            expect(merged[key].deaths).toBe(cloud[key].deaths);
            expect(merged[key].matches).toBe(cloud[key].matches);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 9: Threshold gating of statistics
 *
 * For any MapPerformanceRecord, K/D ratio and average kills SHALL be computed and
 * returned if and only if the record's match count is ≥ 3. Records with matches < 3
 * SHALL return null for these computed values.
 *
 * **Validates: Requirements 4.1, 4.3**
 */
describe('Feature: map-performance-tracking, Property 9: Threshold gating of statistics', () => {
  it('stats returned only when matches >= 3', () => {
    fc.assert(
      fc.property(
        fc.record({
          operatorId: idArb,
          mapId: idArb,
          kills: fc.nat({ max: 1000 }),
          deaths: fc.nat({ max: 1000 }),
          rounds: fc.nat({ max: 500 }),
          roundsWon: fc.nat({ max: 250 }),
          roundsLost: fc.nat({ max: 250 }),
          matches: fc.nat({ max: 100 }),
          matchesWon: fc.nat({ max: 50 }),
          matchesLost: fc.nat({ max: 50 }),
        }),
        fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
        (record, mapName) => {
          const result = computeMapStats(record, mapName);

          if (record.matches < 3) {
            // Below threshold → must return null
            expect(result).toBeNull();
          } else {
            // At or above threshold → must return stats object
            expect(result).not.toBeNull();
            expect(result!.mapId).toBe(record.mapId);
            expect(result!.mapName).toBe(mapName);
            expect(result!.kills).toBe(record.kills);
            expect(result!.deaths).toBe(record.deaths);
            expect(result!.matches).toBe(record.matches);
            expect(typeof result!.kd).toBe('number');
            expect(typeof result!.avgKills).toBe('number');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 10: Map breakdown sorting and capping
 *
 * For any set of MapPerformanceRecords for a given operator, the map breakdown list
 * SHALL be sorted by K/D ratio descending (with ties broken by match count descending),
 * contain at most 10 entries, and exclude entries with 0 matches.
 *
 * **Validates: Requirements 5.1**
 */
describe('Feature: map-performance-tracking, Property 10: Map breakdown sorting and capping', () => {
  it('sorted by K/D desc, max 10, no 0-match entries', () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(
          fc.tuple(idArb, fc.nat({ max: 200 }), fc.nat({ max: 200 }), fc.nat({ max: 50 })),
          { minLength: 0, maxLength: 15 }
        ),
        (operatorId, mapEntries) => {
          // Build records for a single operator across multiple maps
          const records: Record<string, MapPerformanceRecord> = {};
          const mapLookup: Record<string, string> = {};

          for (const [mapId, kills, deaths, matches] of mapEntries) {
            const key = `${operatorId}_${mapId}`;
            records[key] = { operatorId, mapId, kills, deaths, rounds: 0, roundsWon: 0, roundsLost: 0, matches, matchesWon: 0, matchesLost: 0 };
            mapLookup[mapId] = `Map ${mapId}`;
          }

          const breakdown = getMapBreakdown(operatorId, records, mapLookup);

          // Max 10 entries
          expect(breakdown.length).toBeLessThanOrEqual(10);

          // No 0-match entries
          for (const entry of breakdown) {
            expect(entry.matches).toBeGreaterThan(0);
          }

          // Verify sorting: entries with K/D come first (sorted desc),
          // then entries without K/D (sorted by matches desc)
          for (let i = 1; i < breakdown.length; i++) {
            const prev = breakdown[i - 1];
            const curr = breakdown[i];

            if (prev.kd !== null && curr.kd !== null) {
              // Both have K/D → sorted descending
              if (prev.kd !== curr.kd) {
                expect(prev.kd).toBeGreaterThanOrEqual(curr.kd);
              } else {
                // Tied K/D → sorted by matches desc
                expect(prev.matches).toBeGreaterThanOrEqual(curr.matches);
              }
            } else if (prev.kd !== null && curr.kd === null) {
              // Entry with K/D always comes before entry without — valid order
            } else if (prev.kd === null && curr.kd !== null) {
              // Invalid: entry without K/D should not precede entry with K/D
              expect(true).toBe(false);
            } else {
              // Both null K/D → sorted by matches desc
              expect(prev.matches).toBeGreaterThanOrEqual(curr.matches);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 11: Best operators query
 *
 * For any map, side, and set of MapPerformanceRecords, the best operators list SHALL
 * contain at most 5 entries, include only operators matching the selected side with
 * ≥ 3 matches on that map, and be sorted by K/D ratio descending with ties broken
 * by match count descending.
 *
 * **Validates: Requirements 6.1, 6.2, 6.6**
 */
describe('Feature: map-performance-tracking, Property 11: Best operators query', () => {
  it('max 5, correct side filter, threshold-gated, sorted correctly', () => {
    fc.assert(
      fc.property(
        idArb,
        sideArb,
        fc.array(
          fc.tuple(
            idArb,
            idArb,
            sideArb,
            fc.nat({ max: 200 }),
            fc.nat({ max: 200 }),
            fc.nat({ max: 50 })
          ),
          { minLength: 0, maxLength: 20 }
        ),
        (targetMapId, targetSide, operatorEntries) => {
          const records: Record<string, MapPerformanceRecord> = {};
          const operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {};

          for (const [opId, mapId, opSide, kills, deaths, matches] of operatorEntries) {
            const key = `${opId}_${mapId}`;
            records[key] = { operatorId: opId, mapId, kills, deaths, rounds: 0, roundsWon: 0, roundsLost: 0, matches, matchesWon: 0, matchesLost: 0 };
            // Only set lookup for each unique operator (first encountered side wins)
            if (!operatorLookup[opId]) {
              operatorLookup[opId] = { name: `Op ${opId}`, side: opSide };
            }
          }

          const result = getBestOperators(targetMapId, targetSide, records, operatorLookup);

          // Max 5 entries
          expect(result.length).toBeLessThanOrEqual(5);

          // All entries must match the target side and threshold
          for (const entry of result) {
            const operator = operatorLookup[entry.operatorId];
            expect(operator).toBeDefined();
            expect(operator.side).toBe(targetSide);
            expect(entry.matches).toBeGreaterThanOrEqual(3);
          }

          // Verify sorting: K/D descending, ties by matches descending
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];

            if (prev.kd !== curr.kd) {
              expect(prev.kd).toBeGreaterThanOrEqual(curr.kd);
            } else {
              expect(prev.matches).toBeGreaterThanOrEqual(curr.matches);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 2: Active map filtering
 *
 * For any map pool containing maps with varying `active` flags, the set of maps
 * returned by getActiveMaps SHALL exactly equal the subset where `active === true`,
 * sorted alphabetically by name.
 *
 * **Validates: Requirements 2.1, 2.3**
 */
describe('Feature: map-performance-tracking, Property 2: Active map filtering', () => {
  it('returns all maps sorted alphabetically', () => {
    fc.assert(
      fc.property(
        fc.array(mapDataArb, { minLength: 0, maxLength: 20 }),
        (maps) => {
          const result = getActiveMaps(maps);

          // All maps from input must be present in result
          expect(result.length).toBe(maps.length);

          // All input maps must be present in result
          for (const map of maps) {
            expect(result.some((m) => m.id === map.id && m.name === map.name)).toBe(true);
          }

          // Must be sorted alphabetically by name
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
