import { describe, it, expect } from 'vitest';
import {
  computeMapStats,
  getMapBreakdown,
  getBestOperators,
  getActiveMaps,
} from '../map-performance';
import type { MapPerformanceRecord } from '../../types/database';
import type { MapData } from '../../data/maps';

describe('map-performance', () => {
  describe('computeMapStats — K/D with 0 deaths', () => {
    it('returns kd equal to kills value when deaths is 0 and kills > 0', () => {
      const record: MapPerformanceRecord = {
        operatorId: 'ash',
        mapId: 'bank',
        kills: 12,
        deaths: 0,
        matches: 5,
      };

      const result = computeMapStats(record, 'Bank');

      expect(result).not.toBeNull();
      expect(result!.kd).toBe(12);
      expect(result!.avgKills).toBe(2.4);
    });

    it('returns kd of 0 when both kills and deaths are 0 but meets threshold', () => {
      const record: MapPerformanceRecord = {
        operatorId: 'thermite',
        mapId: 'border',
        kills: 0,
        deaths: 0,
        matches: 3,
      };

      const result = computeMapStats(record, 'Border');

      expect(result).not.toBeNull();
      expect(result!.kd).toBe(0);
      expect(result!.avgKills).toBe(0);
    });

    it('returns null when matches are below threshold', () => {
      const record: MapPerformanceRecord = {
        operatorId: 'ash',
        mapId: 'bank',
        kills: 5,
        deaths: 2,
        matches: 2,
      };

      const result = computeMapStats(record, 'Bank');

      expect(result).toBeNull();
    });
  });

  describe('getActiveMaps — deactivated maps excluded', () => {
    it('excludes maps with active=false from the active map list', () => {
      const maps: MapData[] = [
        { id: 'bank', name: 'Bank', active: true, sites: [] },
        { id: 'border', name: 'Border', active: false, sites: [] },
        { id: 'clubhouse', name: 'Clubhouse', active: true, sites: [] },
      ];

      const result = getActiveMaps(maps);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.id)).toEqual(['bank', 'clubhouse']);
    });

    it('retains records referencing deactivated maps (records are independent of active flag)', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 10,
          deaths: 3,
          matches: 4,
        },
        'ash_border': {
          operatorId: 'ash',
          mapId: 'border',
          kills: 8,
          deaths: 2,
          matches: 3,
        },
      };

      const maps: MapData[] = [
        { id: 'bank', name: 'Bank', active: true, sites: [] },
        { id: 'border', name: 'Border', active: false, sites: [] },
      ];

      // Deactivating a map does NOT affect records
      const activeMaps = getActiveMaps(maps);
      expect(activeMaps).toHaveLength(1);
      expect(activeMaps[0].id).toBe('bank');

      // Records for the deactivated map remain unchanged
      expect(records['ash_border']).toEqual({
        operatorId: 'ash',
        mapId: 'border',
        kills: 8,
        deaths: 2,
        matches: 3,
      });
    });

    it('returns maps sorted alphabetically', () => {
      const maps: MapData[] = [
        { id: 'oregon', name: 'Oregon', active: true, sites: [] },
        { id: 'bank', name: 'Bank', active: true, sites: [] },
        { id: 'clubhouse', name: 'Clubhouse', active: true, sites: [] },
      ];

      const result = getActiveMaps(maps);

      expect(result.map((m) => m.name)).toEqual(['Bank', 'Clubhouse', 'Oregon']);
    });
  });

  describe('getMapBreakdown — excludes entries with 0 matches', () => {
    it('does not include records with 0 matches in the breakdown', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 10,
          deaths: 3,
          matches: 5,
        },
        'ash_border': {
          operatorId: 'ash',
          mapId: 'border',
          kills: 0,
          deaths: 0,
          matches: 0,
        },
        'ash_clubhouse': {
          operatorId: 'ash',
          mapId: 'clubhouse',
          kills: 2,
          deaths: 1,
          matches: 1,
        },
      };

      const mapLookup: Record<string, string> = {
        bank: 'Bank',
        border: 'Border',
        clubhouse: 'Clubhouse',
      };

      const result = getMapBreakdown('ash', records, mapLookup);

      // border (0 matches) should be excluded
      expect(result.map((e) => e.mapId)).not.toContain('border');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when all records have 0 matches', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 0,
          deaths: 0,
          matches: 0,
        },
      };

      const mapLookup: Record<string, string> = { bank: 'Bank' };
      const result = getMapBreakdown('ash', records, mapLookup);

      expect(result).toEqual([]);
    });
  });

  describe('getBestOperators — empty when no qualifying data', () => {
    it('returns empty array when no operators meet the threshold', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 5,
          deaths: 2,
          matches: 2, // below threshold of 3
        },
        'thermite_bank': {
          operatorId: 'thermite',
          mapId: 'bank',
          kills: 3,
          deaths: 1,
          matches: 1, // below threshold
        },
      };

      const operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {
        ash: { name: 'Ash', side: 'attacker' },
        thermite: { name: 'Thermite', side: 'attacker' },
      };

      const result = getBestOperators('bank', 'attacker', records, operatorLookup);

      expect(result).toEqual([]);
    });

    it('returns empty array when no operators match the requested side', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 15,
          deaths: 3,
          matches: 5,
        },
      };

      const operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {
        ash: { name: 'Ash', side: 'attacker' },
      };

      // Ask for defenders, but only attackers have data
      const result = getBestOperators('bank', 'defender', records, operatorLookup);

      expect(result).toEqual([]);
    });

    it('returns empty array when no records exist for the requested map', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'ash_bank': {
          operatorId: 'ash',
          mapId: 'bank',
          kills: 10,
          deaths: 3,
          matches: 4,
        },
      };

      const operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {
        ash: { name: 'Ash', side: 'attacker' },
      };

      const result = getBestOperators('border', 'attacker', records, operatorLookup);

      expect(result).toEqual([]);
    });

    it('returns empty array when records object is empty', () => {
      const records: Record<string, MapPerformanceRecord> = {};
      const operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {};

      const result = getBestOperators('bank', 'attacker', records, operatorLookup);

      expect(result).toEqual([]);
    });
  });
});
