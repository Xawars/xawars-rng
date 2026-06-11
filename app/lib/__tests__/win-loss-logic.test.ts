import { describe, it, expect } from 'vitest';
import {
  deserializeMapWinLoss,
  computeWinRate,
  hasLimitedData,
} from '../win-loss-logic';

describe('win-loss-logic', () => {
  describe('deserializeMapWinLoss', () => {
    it('returns empty object on invalid JSON', () => {
      expect(deserializeMapWinLoss('not valid json')).toEqual({});
      expect(deserializeMapWinLoss('')).toEqual({});
      expect(deserializeMapWinLoss('{broken')).toEqual({});
    });
  });

  describe('computeWinRate', () => {
    it('returns null for 0 total outcomes', () => {
      const record = { mapId: 'bank', wins: 0, losses: 0 };
      expect(computeWinRate(record)).toBeNull();
    });
  });

  describe('hasLimitedData', () => {
    it('returns true when outcomes are 4 (below threshold)', () => {
      const record = { mapId: 'bank', wins: 2, losses: 2 };
      expect(hasLimitedData(record)).toBe(true);
    });

    it('returns false when outcomes are 5 (at threshold)', () => {
      const record = { mapId: 'bank', wins: 3, losses: 2 };
      expect(hasLimitedData(record)).toBe(false);
    });
  });
});
