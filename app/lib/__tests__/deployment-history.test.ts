import { describe, it, expect } from 'vitest';
import {
  addDeployment,
  enforceCapacity,
  getOldestDeployment,
  getNewestDeployment,
  sortByDeployedAt,
  MAX_DEPLOYMENT_HISTORY,
} from '../deployment-history';
import type { DeploymentRecord } from '../../types/database';

function makeRecord(overrides: Partial<DeploymentRecord> = {}): DeploymentRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    operatorId: overrides.operatorId ?? 'op-1',
    operatorName: overrides.operatorName ?? 'Ash',
    operatorSide: overrides.operatorSide ?? 'attacker',
    loadout: overrides.loadout ?? { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' },
    matchType: overrides.matchType ?? 'Ranked',
    platform: overrides.platform ?? 'PC',
    targetKills: overrides.targetKills ?? 3,
    role: overrides.role ?? 'Entry Fragger',
    deployedAt: overrides.deployedAt ?? new Date().toISOString(),
  };
}

describe('deployment-history', () => {
  describe('addDeployment', () => {
    it('adds a record to an empty history', () => {
      const record = makeRecord();
      const result = addDeployment([], record);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(record);
    });

    it('adds a record to a non-full history', () => {
      const existing = Array.from({ length: 50 }, (_, i) =>
        makeRecord({ deployedAt: new Date(2024, 0, i + 1).toISOString() })
      );
      const newRecord = makeRecord({ deployedAt: new Date(2024, 2, 1).toISOString() });
      const result = addDeployment(existing, newRecord);
      expect(result).toHaveLength(51);
      expect(result).toContain(newRecord);
    });

    it('removes the oldest record when history is at capacity', () => {
      const records = Array.from({ length: 100 }, (_, i) =>
        makeRecord({
          id: `id-${i}`,
          deployedAt: new Date(2024, 0, i + 1).toISOString(),
        })
      );
      const oldest = records[0];
      const newRecord = makeRecord({
        id: 'new-record',
        deployedAt: new Date(2024, 4, 1).toISOString(),
      });

      const result = addDeployment(records, newRecord);
      expect(result).toHaveLength(100);
      expect(result).toContain(newRecord);
      expect(result).not.toContain(oldest);
    });

    it('always retains the newest record after adding', () => {
      const records = Array.from({ length: 100 }, (_, i) =>
        makeRecord({ deployedAt: new Date(2024, 0, i + 1).toISOString() })
      );
      const newRecord = makeRecord({ deployedAt: new Date(2025, 0, 1).toISOString() });

      const result = addDeployment(records, newRecord);
      expect(result).toContain(newRecord);
    });

    it('never exceeds MAX_DEPLOYMENT_HISTORY', () => {
      const records = Array.from({ length: 100 }, (_, i) =>
        makeRecord({ deployedAt: new Date(2024, 0, i + 1).toISOString() })
      );
      const newRecord = makeRecord({ deployedAt: new Date(2025, 0, 1).toISOString() });

      const result = addDeployment(records, newRecord);
      expect(result.length).toBeLessThanOrEqual(MAX_DEPLOYMENT_HISTORY);
    });
  });

  describe('enforceCapacity', () => {
    it('returns the same array when under capacity', () => {
      const records = Array.from({ length: 50 }, (_, i) =>
        makeRecord({ deployedAt: new Date(2024, 0, i + 1).toISOString() })
      );
      const result = enforceCapacity(records);
      expect(result).toHaveLength(50);
    });

    it('trims to maxSize keeping the newest records', () => {
      const records = Array.from({ length: 105 }, (_, i) =>
        makeRecord({
          id: `id-${i}`,
          deployedAt: new Date(2024, 0, i + 1).toISOString(),
        })
      );
      const result = enforceCapacity(records);
      expect(result).toHaveLength(100);
      // The oldest 5 should be removed
      expect(result.find((r) => r.id === 'id-0')).toBeUndefined();
      expect(result.find((r) => r.id === 'id-4')).toBeUndefined();
      // The newest should remain
      expect(result.find((r) => r.id === 'id-104')).toBeDefined();
    });

    it('respects a custom maxSize', () => {
      const records = Array.from({ length: 20 }, (_, i) =>
        makeRecord({ deployedAt: new Date(2024, 0, i + 1).toISOString() })
      );
      const result = enforceCapacity(records, 10);
      expect(result).toHaveLength(10);
    });
  });

  describe('sortByDeployedAt', () => {
    it('sorts records in ascending order by timestamp', () => {
      const records = [
        makeRecord({ deployedAt: '2024-03-01T00:00:00Z' }),
        makeRecord({ deployedAt: '2024-01-01T00:00:00Z' }),
        makeRecord({ deployedAt: '2024-02-01T00:00:00Z' }),
      ];
      const sorted = sortByDeployedAt(records);
      expect(sorted[0].deployedAt).toBe('2024-01-01T00:00:00Z');
      expect(sorted[1].deployedAt).toBe('2024-02-01T00:00:00Z');
      expect(sorted[2].deployedAt).toBe('2024-03-01T00:00:00Z');
    });

    it('does not mutate the original array', () => {
      const records = [
        makeRecord({ deployedAt: '2024-03-01T00:00:00Z' }),
        makeRecord({ deployedAt: '2024-01-01T00:00:00Z' }),
      ];
      const original = [...records];
      sortByDeployedAt(records);
      expect(records).toEqual(original);
    });
  });

  describe('getOldestDeployment', () => {
    it('returns undefined for empty history', () => {
      expect(getOldestDeployment([])).toBeUndefined();
    });

    it('returns the record with the earliest deployedAt', () => {
      const records = [
        makeRecord({ id: 'mid', deployedAt: '2024-02-01T00:00:00Z' }),
        makeRecord({ id: 'oldest', deployedAt: '2024-01-01T00:00:00Z' }),
        makeRecord({ id: 'newest', deployedAt: '2024-03-01T00:00:00Z' }),
      ];
      const oldest = getOldestDeployment(records);
      expect(oldest?.id).toBe('oldest');
    });
  });

  describe('getNewestDeployment', () => {
    it('returns undefined for empty history', () => {
      expect(getNewestDeployment([])).toBeUndefined();
    });

    it('returns the record with the latest deployedAt', () => {
      const records = [
        makeRecord({ id: 'mid', deployedAt: '2024-02-01T00:00:00Z' }),
        makeRecord({ id: 'oldest', deployedAt: '2024-01-01T00:00:00Z' }),
        makeRecord({ id: 'newest', deployedAt: '2024-03-01T00:00:00Z' }),
      ];
      const newest = getNewestDeployment(records);
      expect(newest?.id).toBe('newest');
    });
  });
});
