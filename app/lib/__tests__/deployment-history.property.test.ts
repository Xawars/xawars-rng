import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { addDeployment, MAX_DEPLOYMENT_HISTORY } from '../deployment-history';
import type { DeploymentRecord } from '../../types/database';

/**
 * Property 4: Deployment History Capacity Invariant
 *
 * For any sequence of deployment additions, the deployment history length SHALL
 * never exceed 100, and when a new deployment is added to a full history, the
 * oldest deployment SHALL be removed while the newest is retained.
 *
 * Validates: Requirements 7.2, 7.3
 */


describe('Feature: auth-persistence-gamification, Property 4: Deployment History Capacity Invariant', () => {
  it('history length never exceeds MAX_DEPLOYMENT_HISTORY after any sequence of additions', () => {
    fc.assert(
      fc.property(
        // Generate sequences of varying lengths including > 100
        fc.array(
          fc.record({
            id: fc.uuid(),
            operatorId: fc.stringMatching(/^op-[a-z0-9]{3,8}$/),
            operatorName: fc.constantFrom('Ash', 'Thermite', 'Sledge', 'Mute', 'Jäger', 'Bandit'),
            operatorSide: fc.constantFrom('attacker' as const, 'defender' as const),
            loadout: fc.record({
              primary: fc.constantFrom('R4-C', 'G36C', 'L85A2', 'MP5'),
              secondary: fc.constantFrom('5.7 USG', 'M45 MEUSOC', 'P226'),
              gadget: fc.constantFrom('Breach Charge', 'Claymore', 'Frag Grenade'),
            }),
            matchType: fc.constantFrom('Ranked' as const, 'Unranked' as const, 'Quick Match' as const, 'Deathmatch' as const),
            platform: fc.constantFrom('PC' as const, 'Console' as const),
            targetKills: fc.integer({ min: 0, max: 20 }),
            role: fc.constantFrom('Entry Fragger', 'Support', 'Anchor', undefined),
            deployedAt: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 0, 1) }).map((d) => d.toISOString()),
          }),
          { minLength: 1, maxLength: 150 }
        ),
        (records) => {
          let history: DeploymentRecord[] = [];

          for (const record of records) {
            history = addDeployment(history, record);
            // After every single addition, history must not exceed capacity
            expect(history.length).toBeLessThanOrEqual(MAX_DEPLOYMENT_HISTORY);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the newest record is always present in the result after adding', () => {
    fc.assert(
      fc.property(
        // Generate an initial history (0 to 100 records)
        fc.array(
          fc.record({
            id: fc.uuid(),
            operatorId: fc.stringMatching(/^op-[a-z0-9]{3,8}$/),
            operatorName: fc.constantFrom('Ash', 'Thermite', 'Sledge', 'Mute'),
            operatorSide: fc.constantFrom('attacker' as const, 'defender' as const),
            loadout: fc.record({
              primary: fc.constantFrom('R4-C', 'G36C', 'L85A2'),
              secondary: fc.constantFrom('5.7 USG', 'M45 MEUSOC'),
              gadget: fc.constantFrom('Breach Charge', 'Claymore'),
            }),
            matchType: fc.constantFrom('Ranked' as const, 'Unranked' as const, 'Quick Match' as const, 'Deathmatch' as const),
            platform: fc.constantFrom('PC' as const, 'Console' as const),
            targetKills: fc.integer({ min: 0, max: 20 }),
            role: fc.constantFrom('Entry Fragger', 'Support', undefined),
            deployedAt: fc.date({ min: new Date(2020, 0, 1), max: new Date(2025, 0, 1) }).map((d) => d.toISOString()),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        // Generate the new record to add (always the newest by timestamp)
        fc.record({
          id: fc.uuid(),
          operatorId: fc.stringMatching(/^op-[a-z0-9]{3,8}$/),
          operatorName: fc.constantFrom('Ash', 'Thermite', 'Sledge', 'Mute'),
          operatorSide: fc.constantFrom('attacker' as const, 'defender' as const),
          loadout: fc.record({
            primary: fc.constantFrom('R4-C', 'G36C', 'L85A2'),
            secondary: fc.constantFrom('5.7 USG', 'M45 MEUSOC'),
            gadget: fc.constantFrom('Breach Charge', 'Claymore'),
          }),
          matchType: fc.constantFrom('Ranked' as const, 'Unranked' as const, 'Quick Match' as const, 'Deathmatch' as const),
          platform: fc.constantFrom('PC' as const, 'Console' as const),
          targetKills: fc.integer({ min: 0, max: 20 }),
          role: fc.constantFrom('Entry Fragger', 'Support', undefined),
          // Ensure this is always the newest timestamp
          deployedAt: fc.constant(new Date(2026, 0, 1).toISOString()),
        }),
        (existingHistory, newRecord) => {
          const result = addDeployment(existingHistory, newRecord);

          // The newly added record must always be present in the result
          const found = result.find((r) => r.id === newRecord.id);
          expect(found).toBeDefined();
          expect(found).toEqual(newRecord);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when history is at capacity, the oldest record is evicted upon adding a new one', () => {
    // Pre-generate a full history of 100 records with deterministic timestamps
    const fullHistory: DeploymentRecord[] = Array.from({ length: MAX_DEPLOYMENT_HISTORY }, (_, i) => ({
      id: `existing-${i}`,
      operatorId: `op-${i}`,
      operatorName: 'Ash',
      operatorSide: 'attacker' as const,
      loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' },
      matchType: 'Ranked' as const,
      platform: 'PC' as const,
      targetKills: 3,
      role: 'Entry Fragger',
      // Each record is 1 hour apart, starting from 2024-01-01
      deployedAt: new Date(2024, 0, 1, i).toISOString(),
    }));

    fc.assert(
      fc.property(
        // Generate the new record with a timestamp newer than all existing
        fc.record({
          id: fc.uuid(),
          operatorId: fc.stringMatching(/^op-[a-z0-9]{3,8}$/),
          operatorName: fc.constantFrom('Ash', 'Thermite', 'Sledge', 'Mute'),
          operatorSide: fc.constantFrom('attacker' as const, 'defender' as const),
          loadout: fc.record({
            primary: fc.constantFrom('R4-C', 'G36C', 'L85A2'),
            secondary: fc.constantFrom('5.7 USG', 'M45 MEUSOC'),
            gadget: fc.constantFrom('Breach Charge', 'Claymore'),
          }),
          matchType: fc.constantFrom('Ranked' as const, 'Unranked' as const, 'Quick Match' as const, 'Deathmatch' as const),
          platform: fc.constantFrom('PC' as const, 'Console' as const),
          targetKills: fc.integer({ min: 0, max: 20 }),
          role: fc.constantFrom('Entry Fragger', 'Support', undefined),
          deployedAt: fc.constant(new Date(2025, 0, 1).toISOString()),
        }),
        (newRecord) => {
          // The oldest record is at index 0 (earliest deployedAt)
          const oldest = fullHistory[0];

          const result = addDeployment(fullHistory, newRecord);

          // History should still be at capacity (not exceed it)
          expect(result).toHaveLength(MAX_DEPLOYMENT_HISTORY);

          // The oldest record should have been evicted
          const oldestStillPresent = result.find((r) => r.id === oldest.id);
          expect(oldestStillPresent).toBeUndefined();

          // The new record should be present
          const newRecordPresent = result.find((r) => r.id === newRecord.id);
          expect(newRecordPresent).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
