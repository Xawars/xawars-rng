import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMapPerformanceRecords,
  saveMapPerformanceRecords,
} from '../map-performance-storage';
import type { MapPerformanceRecord } from '../../types/database';

describe('map-performance-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('loadMapPerformanceRecords', () => {
    it('returns empty object when localStorage has no data', () => {
      const result = loadMapPerformanceRecords();
      expect(result).toEqual({});
    });

    it('returns parsed records when valid JSON exists', () => {
      const records: Record<string, MapPerformanceRecord> = {
        ash_bank: { operatorId: 'ash', mapId: 'bank', kills: 12, deaths: 5, matches: 4 },
        thermite_border: { operatorId: 'thermite', mapId: 'border', kills: 8, deaths: 3, matches: 3 },
      };
      localStorage.setItem('xawars_mapPerformance', JSON.stringify(records));

      const result = loadMapPerformanceRecords();
      expect(result).toEqual(records);
    });

    it('returns empty object when JSON is corrupted', () => {
      localStorage.setItem('xawars_mapPerformance', '{not valid json!!!');

      const result = loadMapPerformanceRecords();
      expect(result).toEqual({});
    });

    it('returns empty object when value is empty string', () => {
      localStorage.setItem('xawars_mapPerformance', '');

      const result = loadMapPerformanceRecords();
      expect(result).toEqual({});
    });
  });

  describe('saveMapPerformanceRecords', () => {
    it('persists records to localStorage under the correct key', () => {
      const records: Record<string, MapPerformanceRecord> = {
        ash_bank: { operatorId: 'ash', mapId: 'bank', kills: 10, deaths: 2, matches: 3 },
      };

      saveMapPerformanceRecords(records);

      const stored = localStorage.getItem('xawars_mapPerformance');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(records);
    });

    it('handles QuotaExceededError gracefully by logging a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      const records: Record<string, MapPerformanceRecord> = {
        ash_bank: { operatorId: 'ash', mapId: 'bank', kills: 10, deaths: 2, matches: 3 },
      };

      // Should not throw
      expect(() => saveMapPerformanceRecords(records)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('[XAWARS] Map performance storage quota exceeded');
    });

    it('re-throws non-quota errors', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('unexpected storage error');
      });

      const records: Record<string, MapPerformanceRecord> = {
        ash_bank: { operatorId: 'ash', mapId: 'bank', kills: 10, deaths: 2, matches: 3 },
      };

      expect(() => saveMapPerformanceRecords(records)).toThrow('unexpected storage error');
    });

    it('uses composite key format {operatorId}_{mapId}', () => {
      const records: Record<string, MapPerformanceRecord> = {
        'sledge_oregon': { operatorId: 'sledge', mapId: 'oregon', kills: 5, deaths: 1, matches: 2 },
        'jager_clubhouse': { operatorId: 'jager', mapId: 'clubhouse', kills: 7, deaths: 4, matches: 3 },
      };

      saveMapPerformanceRecords(records);

      const stored = JSON.parse(localStorage.getItem('xawars_mapPerformance')!);
      expect(stored).toHaveProperty('sledge_oregon');
      expect(stored).toHaveProperty('jager_clubhouse');
      expect(stored['sledge_oregon'].operatorId).toBe('sledge');
      expect(stored['sledge_oregon'].mapId).toBe('oregon');
    });
  });
});
