import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  loadMapPerformanceRecords,
  saveMapPerformanceRecords,
} from '../map-performance-storage';
import type { MapPerformanceRecord } from '../../types/database';

// --- Generators ---

/** Generates a short alphanumeric ID without underscores (safe for composite keys) */
const idArb = fc
  .string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' })
  .filter((s) => /^[a-zA-Z0-9]+$/.test(s));

/** Generates a valid MapPerformanceRecord */
const mapPerformanceRecordArb = (operatorId?: string, mapId?: string) =>
  fc.record({
    operatorId: operatorId ? fc.constant(operatorId) : idArb,
    mapId: mapId ? fc.constant(mapId) : idArb,
    kills: fc.nat({ max: 5000 }),
    deaths: fc.nat({ max: 5000 }),
    matches: fc.nat({ max: 500 }),
  });

/** Generates a record set keyed by composite key `{operatorId}_{mapId}` */
const recordSetArb = fc
  .array(
    fc.tuple(idArb, idArb).chain(([opId, mapId]) =>
      mapPerformanceRecordArb(opId, mapId).map((rec) => ({
        key: `${opId}_${mapId}`,
        record: rec,
      }))
    ),
    { minLength: 1, maxLength: 15 }
  )
  .map((entries) => {
    const records: Record<string, MapPerformanceRecord> = {};
    for (const { key, record } of entries) {
      records[key] = record;
    }
    return records;
  });

/** Generates a random map ID string (including null for placeholder) */
const mapSelectionArb = fc.oneof(
  idArb,
  fc.constant(null as string | null)
);

// --- Setup ---

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Property Tests ---

/**
 * Feature: map-performance-tracking, Property 6: localStorage round-trip for performance records
 *
 * For any valid set of MapPerformanceRecords, serializing to localStorage under
 * `xawars_mapPerformance` and deserializing SHALL produce an equivalent set of
 * records with the composite key format `{operatorId}_{mapId}`.
 *
 * **Validates: Requirements 3.3**
 */
describe('Feature: map-performance-tracking, Property 6: localStorage round-trip for performance records', () => {
  it('serialize/deserialize produces equivalent records', () => {
    fc.assert(
      fc.property(recordSetArb, (records) => {
        saveMapPerformanceRecords(records);
        const loaded = loadMapPerformanceRecords();

        // Loaded records should deeply equal saved records
        expect(loaded).toEqual(records);

        // Verify composite key format is preserved
        for (const key of Object.keys(loaded)) {
          const rec = loaded[key];
          expect(key).toBe(`${rec.operatorId}_${rec.mapId}`);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 13: Map selector persistence round-trip
 *
 * For any valid map selection (including null/placeholder), persisting the selection
 * to localStorage and reading it back SHALL return the same selection value.
 *
 * **Validates: Requirements 1.6**
 */
describe('Feature: map-performance-tracking, Property 13: Map selector persistence round-trip', () => {
  const SELECTED_MAP_KEY = 'xawars_selectedMap';

  it('persisting and reading map selection returns same value', () => {
    fc.assert(
      fc.property(idArb, (mapId) => {
        // Persist the map selection
        localStorage.setItem(SELECTED_MAP_KEY, mapId);

        // Read it back
        const readValue = localStorage.getItem(SELECTED_MAP_KEY);

        // Assert round-trip equality
        expect(readValue).toBe(mapId);
      }),
      { numRuns: 100 }
    );
  });

  it('saving null (removing the key) and reading back returns null', () => {
    fc.assert(
      fc.property(mapSelectionArb, (selection) => {
        if (selection === null) {
          // Remove the key to represent no selection
          localStorage.removeItem(SELECTED_MAP_KEY);
          const readValue = localStorage.getItem(SELECTED_MAP_KEY);
          expect(readValue).toBeNull();
        } else {
          // Persist the selection
          localStorage.setItem(SELECTED_MAP_KEY, selection);
          const readValue = localStorage.getItem(SELECTED_MAP_KEY);
          expect(readValue).toBe(selection);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: map-performance-tracking, Property 8: Failed persistence preserves state
 *
 * For any MapPerformanceRecord state and any failed persistence operation,
 * the state after the failed operation SHALL be identical to the state before
 * the operation.
 *
 * **Validates: Requirements 3.5**
 */
describe('Feature: map-performance-tracking, Property 8: Failed persistence preserves state', () => {
  it('state unchanged after failed operation', () => {
    fc.assert(
      fc.property(recordSetArb, recordSetArb, (initialRecords, newRecords) => {
        // Store initial state successfully
        saveMapPerformanceRecords(initialRecords);

        // Verify initial state is stored
        const beforeAttempt = loadMapPerformanceRecords();
        expect(beforeAttempt).toEqual(initialRecords);

        // Mock localStorage.setItem to throw QuotaExceededError
        const quotaError = new DOMException(
          'Failed to execute \'setItem\' on \'Storage\': quota exceeded',
          'QuotaExceededError'
        );
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw quotaError;
        });

        // Attempt to save new records (should fail gracefully)
        saveMapPerformanceRecords(newRecords);

        // Restore mock before reading
        setItemSpy.mockRestore();

        // Load records — should still be the initial state
        const afterFailedAttempt = loadMapPerformanceRecords();
        expect(afterFailedAttempt).toEqual(initialRecords);
      }),
      { numRuns: 100 }
    );
  });
});
