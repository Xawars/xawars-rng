import { describe, it, expect } from 'vitest';
import {
  initialStreakState,
  applyStreakAction,
  captureSnapshot,
  computeSessionDeltas,
} from '../session-logic';

describe('session-logic', () => {
  describe('initialStreakState', () => {
    it('initializes streak counter to 0', () => {
      const state = initialStreakState();
      expect(state.count).toBe(0);
      expect(state.isHotStreak).toBe(false);
    });
  });

  describe('applyStreakAction - decrement at 0', () => {
    it('kill decrement at streak 0 stays at 0', () => {
      const state = initialStreakState();
      const result = applyStreakAction(state, 'decrement');
      expect(result.count).toBe(0);
      expect(result.isHotStreak).toBe(false);
    });
  });

  describe('computeSessionDeltas', () => {
    it('returns isPerfect when kills > 0 and deaths = 0', () => {
      const snapshot = captureSnapshot(0, 0, {}, {}, {});
      const result = computeSessionDeltas(
        snapshot,
        5, // currentKills
        0, // currentDeaths
        {},
        {},
        {},
        {}
      );
      expect(result.isPerfect).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.kills).toBe(5);
      expect(result.deaths).toBe(0);
    });

    it('returns isEmpty when both kills and deaths are 0', () => {
      const snapshot = captureSnapshot(0, 0, {}, {}, {});
      const result = computeSessionDeltas(
        snapshot,
        0, // currentKills
        0, // currentDeaths
        {},
        {},
        {},
        {}
      );
      expect(result.isEmpty).toBe(true);
      expect(result.isPerfect).toBe(false);
      expect(result.kdRatio).toBeNull();
    });
  });
});
