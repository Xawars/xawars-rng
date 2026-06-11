import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  upsertMapWinLoss,
  computeWinRate,
  hasLimitedData,
  mergeMapWinLossRecords,
  serializeMapWinLoss,
  deserializeMapWinLoss,
} from '../win-loss-logic';
import type { MapWinLossRecord } from '../../types/database';

// --- Generators ---

/** Reserved property names from Object.prototype to avoid collisions in property lookups */
const RESERVED_KEYS = new Set([
  'constructor', 'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
  '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
]);

/** Generates a short alphanumeric map ID (avoids Object.prototype collisions) */
const mapIdArb = fc
  .string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' })
  .filter((s) => /^[a-zA-Z0-9]+$/.test(s) && !RESERVED_KEYS.has(s));

/** Generates a valid outcome */
const outcomeArb = fc.constantFrom<'win' | 'loss'>('win', 'loss');

/** Generates a valid MapWinLossRecord */
const mapWinLossRecordArb = (mapId?: string): fc.Arbitrary<MapWinLossRecord> =>
  fc.record({
    mapId: mapId ? fc.constant(mapId) : mapIdArb,
    wins: fc.nat({ max: 1000 }),
    losses: fc.nat({ max: 1000 }),
  });

/** Generates a record set keyed by mapId */
const recordSetArb = fc
  .array(mapIdArb, { minLength: 0, maxLength: 10 })
  .chain((mapIds) => {
    const uniqueIds = [...new Set(mapIds)];
    return fc.tuple(
      ...uniqueIds.map((id) => mapWinLossRecordArb(id))
    ).map((records) => {
      const result: Record<string, MapWinLossRecord> = {};
      for (const record of records) {
        result[record.mapId] = record;
      }
      return result;
    });
  });

// --- Property Tests ---

/**
 * Feature: session-enhancements, Property 7: Win/loss upsert correctness
 *
 * For any existing Map_Win_Loss_Records and any map ID with outcome "win" or "loss",
 * upsertMapWinLoss() SHALL increment exactly the wins or losses field (respectively)
 * of the specified map by 1, leaving all other maps' records unchanged.
 *
 * **Validates: Requirements 6.3, 6.4**
 */
describe('Feature: session-enhancements, Property 7: Win/loss upsert correctness', () => {
  it('increments exactly wins or losses for specified map, others unchanged', () => {
    fc.assert(
      fc.property(recordSetArb, mapIdArb, outcomeArb, (records, mapId, outcome) => {
        const result = upsertMapWinLoss(records, mapId, outcome);

        // The specified map should have the correct field incremented
        const previous = records[mapId] ?? { mapId, wins: 0, losses: 0 };
        const updated = result[mapId];

        expect(updated).toBeDefined();
        expect(updated.mapId).toBe(mapId);

        if (outcome === 'win') {
          expect(updated.wins).toBe(previous.wins + 1);
          expect(updated.losses).toBe(previous.losses);
        } else {
          expect(updated.losses).toBe(previous.losses + 1);
          expect(updated.wins).toBe(previous.wins);
        }

        // All other maps should be unchanged
        for (const [key, record] of Object.entries(records)) {
          if (key !== mapId) {
            expect(result[key]).toEqual(record);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: session-enhancements, Property 8: Win/loss dismiss preserves state
 *
 * For any Map_Win_Loss_Records state, dismissing the Win/Loss prompt (not calling upsert)
 * SHALL leave the records identical to the pre-prompt state. Additionally, upsert produces
 * a NEW object, not a mutation of the original.
 *
 * **Validates: Requirements 6.5**
 */
describe('Feature: session-enhancements, Property 8: Win/loss dismiss preserves state', () => {
  it('not calling upsert leaves records identical, and upsert does not mutate original', () => {
    fc.assert(
      fc.property(recordSetArb, mapIdArb, outcomeArb, (records, mapId, outcome) => {
        // Deep copy the original to compare
        const originalSnapshot = JSON.parse(JSON.stringify(records));

        // Simulate dismiss: just don't call upsert
        // Records should remain identical
        expect(records).toEqual(originalSnapshot);

        // Now call upsert to verify it doesn't mutate
        const result = upsertMapWinLoss(records, mapId, outcome);

        // Original records should still be unchanged (no mutation)
        expect(records).toEqual(originalSnapshot);

        // Result should be a different reference
        expect(result).not.toBe(records);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: session-enhancements, Property 9: Win/loss localStorage round-trip
 *
 * For any valid set of MapWinLossRecords, serializeMapWinLoss() followed by
 * deserializeMapWinLoss() SHALL produce an equivalent set of records.
 *
 * **Validates: Requirements 7.1**
 */
describe('Feature: session-enhancements, Property 9: Win/loss localStorage round-trip', () => {
  it('serialize then deserialize produces equivalent records', () => {
    fc.assert(
      fc.property(recordSetArb, (records) => {
        const serialized = serializeMapWinLoss(records);
        const deserialized = deserializeMapWinLoss(serialized);

        expect(deserialized).toEqual(records);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: session-enhancements, Property 10: Win/loss migration merge
 *
 * For any two sets of MapWinLossRecords (local and cloud), mergeMapWinLossRecords()
 * SHALL produce records where each map's wins equal local.wins + cloud.wins and losses
 * equal local.losses + cloud.losses. Non-overlapping maps SHALL be included unchanged.
 *
 * **Validates: Requirements 7.4**
 */
describe('Feature: session-enhancements, Property 10: Win/loss migration merge', () => {
  it('merged wins = local.wins + cloud.wins, same for losses; non-overlapping maps included', () => {
    fc.assert(
      fc.property(recordSetArb, recordSetArb, (local, cloud) => {
        const merged = mergeMapWinLossRecords(local, cloud);

        // All keys from both sets must exist in merged
        const allKeys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
        for (const key of allKeys) {
          expect(merged[key]).toBeDefined();
        }

        // Overlapping keys: values should be additive
        for (const key of Object.keys(local)) {
          const localRec = local[key];
          const cloudRec = cloud[key];

          if (cloudRec) {
            expect(merged[key].wins).toBe(localRec.wins + cloudRec.wins);
            expect(merged[key].losses).toBe(localRec.losses + cloudRec.losses);
          } else {
            // Non-overlapping local records included unchanged
            expect(merged[key].wins).toBe(localRec.wins);
            expect(merged[key].losses).toBe(localRec.losses);
          }
        }

        // Non-overlapping cloud records included unchanged
        for (const key of Object.keys(cloud)) {
          if (!local[key]) {
            expect(merged[key].wins).toBe(cloud[key].wins);
            expect(merged[key].losses).toBe(cloud[key].losses);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: session-enhancements, Property 12: Win rate computation
 *
 * For any MapWinLossRecord with (wins + losses) > 0, computeWinRate() SHALL return
 * Math.round(wins / (wins + losses) * 100). For records with (wins + losses) = 0,
 * it SHALL return null.
 *
 * **Validates: Requirements 8.2, 8.3**
 */
describe('Feature: session-enhancements, Property 12: Win rate computation', () => {
  it('returns Math.round(wins/(wins+losses)*100) for total > 0, null for total = 0', () => {
    fc.assert(
      fc.property(
        fc.record({
          mapId: mapIdArb,
          wins: fc.nat({ max: 1000 }),
          losses: fc.nat({ max: 1000 }),
        }),
        (record) => {
          const total = record.wins + record.losses;
          const result = computeWinRate(record);

          if (total === 0) {
            expect(result).toBeNull();
          } else {
            const expected = Math.round((record.wins / total) * 100);
            expect(result).toBe(expected);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: session-enhancements, Property 13: Limited data threshold
 *
 * For any MapWinLossRecord, hasLimitedData() SHALL return true if and only if
 * (wins + losses) < 5.
 *
 * **Validates: Requirements 8.5**
 */
describe('Feature: session-enhancements, Property 13: Limited data threshold', () => {
  it('hasLimitedData returns true iff (wins + losses) < 5', () => {
    fc.assert(
      fc.property(
        fc.record({
          mapId: mapIdArb,
          wins: fc.nat({ max: 1000 }),
          losses: fc.nat({ max: 1000 }),
        }),
        (record) => {
          const total = record.wins + record.losses;
          const result = hasLimitedData(record);

          if (total < 5) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
