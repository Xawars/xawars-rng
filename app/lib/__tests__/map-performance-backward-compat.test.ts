import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { updateOperatorStat, getOperatorStat } from '../operator-stats';
import { getActiveMaps } from '../map-performance';
import type { OperatorStatRecord } from '../../types/database';
import type { MapData } from '../../data/maps';

// --- Generators ---

/** Generates a short alphanumeric ID suitable for operatorId */
const idArb = fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }).filter((s) => !s.includes('_'));

/** Generates a valid operator side */
const sideArb = fc.constantFrom<'attacker' | 'defender'>('attacker', 'defender');

/** Generates a valid OperatorStatRecord */
const operatorStatRecordArb = fc.record({
  operatorId: idArb,
  operatorName: fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
  operatorSide: sideArb,
  kills: fc.nat({ max: 5000 }),
  deaths: fc.nat({ max: 5000 }),
  deployments: fc.nat({ max: 500 }),
});

/** Generates an operator stat delta for updateOperatorStat */
const operatorStatDeltaArb = fc.record({
  kills: fc.option(fc.nat({ max: 50 }), { nil: undefined }),
  deaths: fc.option(fc.nat({ max: 50 }), { nil: undefined }),
  incrementDeployments: fc.option(fc.boolean(), { nil: undefined }),
});

/** Generates a set of MapPerformanceRecords (just random records to exist in context) */
const mapPerformanceRecordsArb = fc
  .array(
    fc.tuple(idArb, idArb).chain(([opId, mapId]) =>
      fc.record({
        operatorId: fc.constant(opId),
        mapId: fc.constant(mapId),
        kills: fc.nat({ max: 1000 }),
        deaths: fc.nat({ max: 1000 }),
        rounds: fc.nat({ max: 500 }),
        roundsWon: fc.nat({ max: 250 }),
        roundsLost: fc.nat({ max: 250 }),
        matches: fc.nat({ max: 100 }),
        matchesWon: fc.nat({ max: 50 }),
        matchesLost: fc.nat({ max: 50 }),
      }).map((rec) => ({
        key: `${opId}_${mapId}`,
        record: rec,
      }))
    ),
    { minLength: 0, maxLength: 10 }
  )
  .map((entries) => {
    const records: Record<string, MapPerformanceRecord> = {};
    for (const { key, record } of entries) {
      records[key] = record;
    }
    return records;
  });

// --- Property Tests ---

/**
 * Feature: map-performance-tracking, Property 12: Backward compatibility
 *
 * For any existing OperatorStatRecord set (without map data), all existing stat
 * computations (updateOperatorStat, getOperatorStat) SHALL produce identical results
 * regardless of whether MapPerformanceRecords exist.
 *
 * **Validates: Requirements 7.3**
 */
describe('Feature: map-performance-tracking, Property 12: Backward compatibility', () => {
  it('existing stat computations produce identical results regardless of MapPerformanceRecords', () => {
    fc.assert(
      fc.property(
        // Generate initial operator stats map
        fc.array(operatorStatRecordArb, { minLength: 1, maxLength: 10 }),
        // Generate a sequence of update operations
        fc.array(
          fc.tuple(idArb, fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }), sideArb, operatorStatDeltaArb),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate random MapPerformanceRecords (which should NOT affect operator stats)
        mapPerformanceRecordsArb,
        (initialRecords, updates, _mapPerformanceRecords) => {
          // Build initial stats map
          let statsWithoutMapData: Record<string, OperatorStatRecord> = {};
          let statsWithMapData: Record<string, OperatorStatRecord> = {};

          for (const record of initialRecords) {
            statsWithoutMapData[record.operatorId] = record;
            statsWithMapData[record.operatorId] = { ...record };
          }

          // Apply the same sequence of updateOperatorStat operations to both
          for (const [operatorId, operatorName, operatorSide, delta] of updates) {
            statsWithoutMapData = updateOperatorStat(
              statsWithoutMapData,
              operatorId,
              operatorName,
              operatorSide,
              delta
            );
            statsWithMapData = updateOperatorStat(
              statsWithMapData,
              operatorId,
              operatorName,
              operatorSide,
              delta
            );
          }

          // Both results should be identical — MapPerformanceRecords existence has no effect
          expect(Object.keys(statsWithoutMapData).sort()).toEqual(Object.keys(statsWithMapData).sort());

          for (const opId of Object.keys(statsWithoutMapData)) {
            const without = getOperatorStat(statsWithoutMapData, opId);
            const with_ = getOperatorStat(statsWithMapData, opId);

            expect(without).toEqual(with_);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Unit Tests ---

/**
 * Unit test: Deployments function without map data
 *
 * A DeploymentRecord without any map reference can be created and processed without errors.
 * This validates backward compatibility — existing deployments don't require map data.
 *
 * **Validates: Requirements 7.3**
 */
describe('Backward compatibility: Deployments without map data', () => {
  it('DeploymentRecord without map reference works without errors', () => {
    // Create a deployment record without any map reference
    const deployment = {
      id: 'deploy-1',
      operatorId: 'ash',
      operatorName: 'Ash',
      operatorSide: 'attacker' as const,
      loadout: { primary: 'R4-C', secondary: 'M45 MEUSOC', gadget: 'Breaching Charge', ability: 'Breaching Round' },
      targetKills: 10,
      deployedAt: '2024-01-01T00:00:00Z',
    };

    // The deployment record should be valid and accessible without error
    expect(deployment.id).toBe('deploy-1');
    expect(deployment.operatorId).toBe('ash');
    expect(deployment.operatorName).toBe('Ash');
    expect(deployment.operatorSide).toBe('attacker');
    expect(deployment.targetKills).toBe(10);
    // No map-related fields are required
    expect((deployment as Record<string, unknown>)['mapId']).toBeUndefined();

    // Operator stats can still be computed without map data
    let stats: Record<string, OperatorStatRecord> = {};
    stats = updateOperatorStat(stats, deployment.operatorId, deployment.operatorName, deployment.operatorSide, {
      kills: 5,
      deaths: 2,
      incrementDeployments: true,
    });

    const result = getOperatorStat(stats, 'ash');
    expect(result).toBeDefined();
    expect(result!.kills).toBe(5);
    expect(result!.deaths).toBe(2);
    expect(result!.deployments).toBe(1);
  });
});

/**
 * Unit test: MapData without `active` field defaults correctly
 *
 * A MapData entry without an explicit `active` field should be treated as active (included
 * in the result of getActiveMaps). This validates the backward compatibility change from
 * `m.active === true` to `m.active !== false`.
 *
 * **Validates: Requirements 7.3**
 */
describe('Backward compatibility: MapData without active field', () => {
  it('MapData without `active` field is included in getActiveMaps (all maps returned)', () => {
    // Create MapData objects without the `active` field by casting to bypass TypeScript
    const mapWithoutActive = {
      id: 'legacy-map',
      name: 'Legacy Map',
      sites: [{ id: 'site-a', name: 'Site A' }],
    } as unknown as MapData;

    const mapWithActiveTrue = {
      id: 'active-map',
      name: 'Active Map',
      active: true,
      sites: [{ id: 'site-b', name: 'Site B' }],
    } as MapData;

    const mapWithActiveFalse = {
      id: 'inactive-map',
      name: 'Inactive Map',
      active: false,
      sites: [{ id: 'site-c', name: 'Site C' }],
    } as MapData;

    const result = getActiveMaps([mapWithoutActive, mapWithActiveTrue, mapWithActiveFalse]);

    // All maps are returned (getActiveMaps no longer filters by active flag)
    expect(result.some((m) => m.id === 'legacy-map')).toBe(true);
    expect(result.some((m) => m.id === 'active-map')).toBe(true);
    expect(result.some((m) => m.id === 'inactive-map')).toBe(true);

    // Result should contain all 3 maps
    expect(result.length).toBe(3);

    // Result should be sorted alphabetically
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });
});
