import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { updateOperatorStat } from '../operator-stats';
import type { OperatorStatRecord } from '../../types/database';

/**
 * Property 5: Operator Stats Independence
 *
 * For any stat update (kills, deaths) applied to one operator, all other
 * operators' stats SHALL remain unchanged.
 *
 * **Validates: Requirements 8.2**
 */

describe('Feature: auth-persistence-gamification, Property 5: Operator Stats Independence', () => {
  // Arbitrary for operator side
  const sideArb = fc.constantFrom('attacker' as const, 'defender' as const);

  // Arbitrary for a single operator stat record
  const operatorStatRecordArb = (id: string) =>
    fc.record({
      operatorId: fc.constant(id),
      operatorName: fc.string({ minLength: 1, maxLength: 20 }),
      operatorSide: sideArb,
      kills: fc.nat({ max: 10000 }),
      deaths: fc.nat({ max: 10000 }),
      deployments: fc.nat({ max: 5000 }),
    });

  // Arbitrary for a stats map with 2-10 operators using unique IDs
  const statsMapArb = fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 2, maxLength: 10 })
    .chain((ids) =>
      fc.tuple(...ids.map((id) => operatorStatRecordArb(id))).map((records) => {
        const map: Record<string, OperatorStatRecord> = {};
        for (const record of records) {
          map[record.operatorId] = record;
        }
        return map;
      })
    );

  // Arbitrary for a stat delta (kills and/or deaths)
  const deltaArb = fc.record({
    kills: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
    deaths: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
    incrementDeployments: fc.option(fc.boolean(), { nil: undefined }),
  });

  it('updating one operator does not change any other operator stats', () => {
    fc.assert(
      fc.property(statsMapArb, deltaArb, (statsMap, delta) => {
        const operatorIds = Object.keys(statsMap);
        // Pick the first operator as the target to update
        const targetId = operatorIds[0];
        const targetRecord = statsMap[targetId];

        const result = updateOperatorStat(
          statsMap,
          targetId,
          targetRecord.operatorName,
          targetRecord.operatorSide,
          delta
        );

        // All OTHER operators must remain unchanged
        for (const id of operatorIds) {
          if (id !== targetId) {
            expect(result[id]).toEqual(statsMap[id]);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('updating any randomly chosen operator preserves all others', () => {
    fc.assert(
      fc.property(
        statsMapArb.chain((statsMap) => {
          const ids = Object.keys(statsMap);
          return fc.tuple(
            fc.constant(statsMap),
            fc.integer({ min: 0, max: ids.length - 1 }).map((idx) => ids[idx])
          );
        }),
        deltaArb,
        ([statsMap, targetId], delta) => {
          const targetRecord = statsMap[targetId];

          const result = updateOperatorStat(
            statsMap,
            targetId,
            targetRecord.operatorName,
            targetRecord.operatorSide,
            delta
          );

          // Verify every other operator is unchanged
          for (const [id, record] of Object.entries(statsMap)) {
            if (id !== targetId) {
              expect(result[id]).toEqual(record);
            }
          }

          // Also verify the total number of operators hasn't changed
          expect(Object.keys(result).length).toBe(Object.keys(statsMap).length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
