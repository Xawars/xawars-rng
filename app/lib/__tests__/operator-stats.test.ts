import { describe, it, expect } from 'vitest';
import { updateOperatorStat, getOperatorStat } from '../operator-stats';
import type { OperatorStatRecord } from '../../types/database';

describe('operator-stats', () => {
  describe('updateOperatorStat', () => {
    it('creates a new entry when operator does not exist', () => {
      const stats: Record<string, OperatorStatRecord> = {};
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { kills: 3 });

      expect(result['ash']).toEqual({
        operatorId: 'ash',
        operatorName: 'Ash',
        operatorSide: 'attacker',
        kills: 3,
        deaths: 0,
        deployments: 0,
      });
    });

    it('updates an existing operator entry with kills delta', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { kills: 2 });

      expect(result['ash'].kills).toBe(7);
      expect(result['ash'].deaths).toBe(2);
      expect(result['ash'].deployments).toBe(3);
    });

    it('updates an existing operator entry with deaths delta', () => {
      const stats: Record<string, OperatorStatRecord> = {
        mute: {
          operatorId: 'mute',
          operatorName: 'Mute',
          operatorSide: 'defender',
          kills: 10,
          deaths: 4,
          deployments: 5,
        },
      };
      const result = updateOperatorStat(stats, 'mute', 'Mute', 'defender', { deaths: 1 });

      expect(result['mute'].kills).toBe(10);
      expect(result['mute'].deaths).toBe(5);
      expect(result['mute'].deployments).toBe(5);
    });

    it('increments deployments when incrementDeployments is true', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { incrementDeployments: true });

      expect(result['ash'].deployments).toBe(4);
      expect(result['ash'].kills).toBe(5);
      expect(result['ash'].deaths).toBe(2);
    });

    it('applies kills, deaths, and deployment increment together', () => {
      const stats: Record<string, OperatorStatRecord> = {};
      const result = updateOperatorStat(stats, 'thermite', 'Thermite', 'attacker', {
        kills: 4,
        deaths: 1,
        incrementDeployments: true,
      });

      expect(result['thermite']).toEqual({
        operatorId: 'thermite',
        operatorName: 'Thermite',
        operatorSide: 'attacker',
        kills: 4,
        deaths: 1,
        deployments: 1,
      });
    });

    it('does not mutate the original stats map', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { kills: 1 });

      expect(stats['ash'].kills).toBe(5);
      expect(result['ash'].kills).toBe(6);
    });

    it('does not affect other operators when updating one', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
        mute: {
          operatorId: 'mute',
          operatorName: 'Mute',
          operatorSide: 'defender',
          kills: 10,
          deaths: 4,
          deployments: 5,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { kills: 3 });

      expect(result['mute']).toEqual(stats['mute']);
    });

    it('handles negative kill deltas', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', { kills: -1 });

      expect(result['ash'].kills).toBe(4);
    });

    it('handles zero delta (no-op update)', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };
      const result = updateOperatorStat(stats, 'ash', 'Ash', 'attacker', {});

      expect(result['ash']).toEqual(stats['ash']);
    });
  });

  describe('getOperatorStat', () => {
    it('returns the stat record for an existing operator', () => {
      const stats: Record<string, OperatorStatRecord> = {
        ash: {
          operatorId: 'ash',
          operatorName: 'Ash',
          operatorSide: 'attacker',
          kills: 5,
          deaths: 2,
          deployments: 3,
        },
      };

      expect(getOperatorStat(stats, 'ash')).toEqual({
        operatorId: 'ash',
        operatorName: 'Ash',
        operatorSide: 'attacker',
        kills: 5,
        deaths: 2,
        deployments: 3,
      });
    });

    it('returns undefined for a non-existent operator', () => {
      const stats: Record<string, OperatorStatRecord> = {};
      expect(getOperatorStat(stats, 'unknown')).toBeUndefined();
    });
  });
});
