import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  initialStreakState,
  applyStreakAction,
  captureSnapshot,
  computeSessionDeltas,
  findBestSessionMap,
} from '../../lib/session-logic';
import type { MapWinLossRecord, MapPerformanceRecord } from '../../types/database';

// --- Arbitraries ---

const streakActionArb = fc.constantFrom('kill' as const, 'death' as const, 'decrement' as const);
const streakActionsArb = fc.array(streakActionArb, { minLength: 0, maxLength: 50 });

const nonNegIntArb = fc.nat({ max: 1000 });

const operatorIdArb = fc.stringMatching(/^op[a-z0-9]{1,8}$/);
const mapIdArb = fc.stringMatching(/^map[a-z0-9]{1,8}$/);

// --- Property Tests ---

describe('Feature: session-enhancements, Property 1: Streak counter state machine', () => {
  /**
   * Validates: Requirements 1.2, 1.3, 1.7
   *
   * For any sequence of actions (kill, death, decrement) applied to an initial streak state
   * of 0, the resulting counter SHALL equal the number of consecutive kills since the last
   * death (or start), minus any decrements applied since the last death, with a floor of 0.
   */
  it('counter equals consecutive kills since last death minus decrements, floored at 0', () => {
    fc.assert(
      fc.property(streakActionsArb, (actions) => {
        // Apply actions via the state machine
        let state = initialStreakState();
        for (const action of actions) {
          state = applyStreakAction(state, action);
        }

        // Compute expected value manually:
        // Find the last death index (or -1 if no death). Then count kills and decrements after it.
        let lastDeathIdx = -1;
        for (let i = actions.length - 1; i >= 0; i--) {
          if (actions[i] === 'death') {
            lastDeathIdx = i;
            break;
          }
        }

        // Simulate expected counter from actions after last death
        let expected = 0;
        const startIdx = lastDeathIdx + 1;
        for (let i = startIdx; i < actions.length; i++) {
          const a = actions[i];
          if (a === 'kill') {
            expected += 1;
          } else if (a === 'decrement') {
            expected = Math.max(0, expected - 1);
          }
          // 'death' shouldn't appear after lastDeathIdx by construction, but handle anyway
        }

        expect(state.count).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });
});

describe('Feature: session-enhancements, Property 2: Hot streak state derivation', () => {
  /**
   * Validates: Requirements 1.4, 1.5
   *
   * For any resulting StreakState (after random actions), isHotStreak is true
   * if and only if count >= 3.
   */
  it('isHotStreak is true iff count >= 3', () => {
    fc.assert(
      fc.property(streakActionsArb, (actions) => {
        let state = initialStreakState();
        for (const action of actions) {
          state = applyStreakAction(state, action);
        }

        expect(state.isHotStreak).toBe(state.count >= 3);
      }),
      { numRuns: 200 }
    );
  });
});

describe('Feature: session-enhancements, Property 4: Session snapshot captures current state', () => {
  /**
   * Validates: Requirements 3.1, 3.6
   *
   * For any valid combination of total kills, total deaths, operator kill/death counts,
   * and map win/loss records, captureSnapshot() SHALL produce a SessionSnapshot where
   * each field equals the corresponding input value.
   */
  it('captureSnapshot output matches inputs exactly', () => {
    const operatorKillsArb = fc.dictionary(operatorIdArb, nonNegIntArb, { minKeys: 0, maxKeys: 5 });
    const operatorDeathsArb = fc.dictionary(operatorIdArb, nonNegIntArb, { minKeys: 0, maxKeys: 5 });
    const mapWinLossArb = fc.dictionary(
      mapIdArb,
      fc.record({
        mapId: mapIdArb,
        wins: nonNegIntArb,
        losses: nonNegIntArb,
      }),
      { minKeys: 0, maxKeys: 5 }
    );

    fc.assert(
      fc.property(
        nonNegIntArb,
        nonNegIntArb,
        operatorKillsArb,
        operatorDeathsArb,
        mapWinLossArb,
        (totalKills, totalDeaths, opKills, opDeaths, mapWL) => {
          // Fix mapId field to match the key
          const fixedMapWL: Record<string, MapWinLossRecord> = {};
          for (const [key, record] of Object.entries(mapWL)) {
            fixedMapWL[key] = { mapId: key, wins: record.wins, losses: record.losses };
          }

          const snapshot = captureSnapshot(totalKills, totalDeaths, opKills, opDeaths, fixedMapWL);

          expect(snapshot.totalKills).toBe(totalKills);
          expect(snapshot.totalDeaths).toBe(totalDeaths);

          // All operator IDs from both kills and deaths should be present
          const allOpIds = new Set([...Object.keys(opKills), ...Object.keys(opDeaths)]);
          for (const id of allOpIds) {
            expect(snapshot.operatorStats[id]).toEqual({
              kills: opKills[id] ?? 0,
              deaths: opDeaths[id] ?? 0,
            });
          }

          // Map win/loss should match
          for (const [key, record] of Object.entries(fixedMapWL)) {
            expect(snapshot.mapWinLoss[key]).toEqual({
              wins: record.wins,
              losses: record.losses,
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: session-enhancements, Property 5: Session delta computation', () => {
  /**
   * Validates: Requirements 4.2
   *
   * For any SessionSnapshot and current state values (current >= snapshot),
   * computeSessionDeltas() SHALL produce kills = (currentKills - snapshotKills),
   * deaths = (currentDeaths - snapshotDeaths), and per-operator deltas computed
   * analogously, with operators sorted by session kills descending then name ascending.
   */
  it('deltas equal current minus snapshot, operators sorted correctly', () => {
    // Generate snapshot base values, then add positive deltas for current values
    const baseArb = fc.record({
      kills: nonNegIntArb,
      deaths: nonNegIntArb,
    });
    const deltaArb = fc.record({
      killsDelta: nonNegIntArb,
      deathsDelta: nonNegIntArb,
    });

    // Generate operator data: a set of operators with snapshot and current kills/deaths
    const operatorsArb = fc.array(
      fc.record({
        id: operatorIdArb,
        name: fc.stringMatching(/^[A-Z][a-z]{2,8}$/),
        snapshotKills: nonNegIntArb,
        snapshotDeaths: nonNegIntArb,
        deltaKills: nonNegIntArb,
        deltaDeaths: nonNegIntArb,
      }),
      { minLength: 0, maxLength: 5 }
    );

    fc.assert(
      fc.property(baseArb, deltaArb, operatorsArb, (base, delta, operators) => {
        const snapshotKills = base.kills;
        const snapshotDeaths = base.deaths;
        const currentKills = base.kills + delta.killsDelta;
        const currentDeaths = base.deaths + delta.deathsDelta;

        // Build snapshot operator stats
        const snapshotOperatorStats: Record<string, { kills: number; deaths: number }> = {};
        const currentOpKills: Record<string, number> = {};
        const currentOpDeaths: Record<string, number> = {};
        const operatorNames: Record<string, string> = {};

        // Deduplicate by id
        const seenIds = new Set<string>();
        const uniqueOps = operators.filter((op) => {
          if (seenIds.has(op.id)) return false;
          seenIds.add(op.id);
          return true;
        });

        for (const op of uniqueOps) {
          snapshotOperatorStats[op.id] = {
            kills: op.snapshotKills,
            deaths: op.snapshotDeaths,
          };
          currentOpKills[op.id] = op.snapshotKills + op.deltaKills;
          currentOpDeaths[op.id] = op.snapshotDeaths + op.deltaDeaths;
          operatorNames[op.id] = op.name;
        }

        const snapshot = {
          totalKills: snapshotKills,
          totalDeaths: snapshotDeaths,
          operatorStats: snapshotOperatorStats,
          mapWinLoss: {},
        };

        const result = computeSessionDeltas(
          snapshot,
          currentKills,
          currentDeaths,
          currentOpKills,
          currentOpDeaths,
          {},
          operatorNames
        );

        // Verify total deltas
        expect(result.kills).toBe(delta.killsDelta);
        expect(result.deaths).toBe(delta.deathsDelta);

        // Verify operators are sorted: kills desc, then name asc
        for (let i = 1; i < result.operators.length; i++) {
          const prev = result.operators[i - 1];
          const curr = result.operators[i];
          if (prev.kills === curr.kills) {
            expect(prev.operatorName.localeCompare(curr.operatorName)).toBeLessThanOrEqual(0);
          } else {
            expect(prev.kills).toBeGreaterThan(curr.kills);
          }
        }

        // Verify each operator delta matches expected
        for (const op of result.operators) {
          const original = uniqueOps.find((o) => o.id === op.operatorId);
          if (original) {
            expect(op.kills).toBe(original.deltaKills);
            expect(op.deaths).toBe(original.deltaDeaths);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: session-enhancements, Property 6: Session best map selection', () => {
  /**
   * Validates: Requirements 4.5
   *
   * For any set of map performance deltas during a session where at least one map has
   * kills or deaths recorded, findBestSessionMap() SHALL return the map with the highest
   * session K/D ratio; when multiple maps tie on K/D, it SHALL return the map with
   * higher total session kills.
   */
  it('returns map with highest K/D, ties broken by kills', () => {
    // Generate 2-5 maps, each with kills and deaths deltas (at least one with activity)
    const mapEntryArb = fc.record({
      mapId: mapIdArb,
      operatorId: operatorIdArb,
      snapshotKills: nonNegIntArb,
      snapshotDeaths: nonNegIntArb,
      deltaKills: fc.nat({ max: 50 }),
      deltaDeaths: fc.nat({ max: 50 }),
    });

    const mapsArb = fc.array(mapEntryArb, { minLength: 1, maxLength: 6 }).filter((maps) => {
      // At least one map must have kills or deaths delta > 0
      return maps.some((m) => m.deltaKills > 0 || m.deltaDeaths > 0);
    });

    fc.assert(
      fc.property(mapsArb, (maps) => {
        // Build snapshot and current MapPerformanceRecords
        const snapshotPerf: Record<string, MapPerformanceRecord> = {};
        const currentPerf: Record<string, MapPerformanceRecord> = {};
        const mapNames: Record<string, string> = {};

        // Deduplicate by composite key (operatorId + mapId)
        const seen = new Set<string>();
        const uniqueMaps = maps.filter((m) => {
          const key = `${m.operatorId}:${m.mapId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        for (const entry of uniqueMaps) {
          const key = `${entry.operatorId}:${entry.mapId}`;
          mapNames[entry.mapId] = `Map_${entry.mapId}`;

          snapshotPerf[key] = {
            operatorId: entry.operatorId,
            mapId: entry.mapId,
            kills: entry.snapshotKills,
            deaths: entry.snapshotDeaths,
            matches: 1,
          };

          currentPerf[key] = {
            operatorId: entry.operatorId,
            mapId: entry.mapId,
            kills: entry.snapshotKills + entry.deltaKills,
            deaths: entry.snapshotDeaths + entry.deltaDeaths,
            matches: 2,
          };
        }

        const result = findBestSessionMap({}, currentPerf, snapshotPerf, mapNames);

        // Compute expected best map manually
        // Aggregate deltas per mapId
        const mapAggs: Record<string, { kills: number; deaths: number }> = {};
        for (const entry of uniqueMaps) {
          if (entry.deltaKills > 0 || entry.deltaDeaths > 0) {
            if (!mapAggs[entry.mapId]) {
              mapAggs[entry.mapId] = { kills: 0, deaths: 0 };
            }
            mapAggs[entry.mapId].kills += entry.deltaKills;
            mapAggs[entry.mapId].deaths += entry.deltaDeaths;
          }
        }

        // Find expected best
        let expectedBestMapId: string | null = null;
        let expectedBestKD = -1;
        let expectedBestKills = -1;

        for (const [mapId, agg] of Object.entries(mapAggs)) {
          if (agg.kills === 0 && agg.deaths === 0) continue;

          let kd: number;
          if (agg.deaths === 0) {
            kd = agg.kills;
          } else {
            kd = agg.kills / agg.deaths;
          }
          const roundedKD = Math.round(kd * 100) / 100;

          if (
            roundedKD > expectedBestKD ||
            (roundedKD === expectedBestKD && agg.kills > expectedBestKills)
          ) {
            expectedBestKD = roundedKD;
            expectedBestKills = agg.kills;
            expectedBestMapId = mapId;
          }
        }

        if (expectedBestMapId === null) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
          expect(result!.mapId).toBe(expectedBestMapId);
          expect(result!.kd).toBe(expectedBestKD);
          expect(result!.mapName).toBe(mapNames[expectedBestMapId]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
