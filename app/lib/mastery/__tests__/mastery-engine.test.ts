import { pointsFor, applyAward, computeTier, pointsToNextTier } from '@/app/lib/mastery/mastery-engine';
import type { MasteryEvent, OperatorMastery } from '@/app/types/mastery';

/**
 * Unit tests for mastery-engine.ts
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

function makeState(overrides: Partial<OperatorMastery> = {}): OperatorMastery {
  return {
    userId: 'user-1',
    operatorId: 'op-1',
    masteryPoints: 0,
    currentTier: 'Bronze',
    ...overrides,
  };
}

describe('pointsFor', () => {
  it('returns 10 for match_result_win', () => {
    expect(pointsFor({ kind: 'match_result_win' })).toBe(10);
  });

  it('returns 5 for match_result_survived', () => {
    expect(pointsFor({ kind: 'match_result_survived' })).toBe(5);
  });

  it('returns 15 for kill_target_complete', () => {
    expect(pointsFor({ kind: 'kill_target_complete' })).toBe(15);
  });

  it('returns the reward value for challenge_completed', () => {
    expect(pointsFor({ kind: 'challenge_completed', reward: 25 })).toBe(25);
  });

  it('returns 0 for challenge_completed with reward 0', () => {
    expect(pointsFor({ kind: 'challenge_completed', reward: 0 })).toBe(0);
  });
});

describe('applyAward', () => {
  it('adds points to the state', () => {
    const state = makeState({ masteryPoints: 50 });
    const { next } = applyAward(state, 10);
    expect(next.masteryPoints).toBe(60);
  });

  it('updates currentTier when a threshold is crossed', () => {
    const state = makeState({ masteryPoints: 95, currentTier: 'Bronze' });
    const { next, tierCrossed } = applyAward(state, 10);
    expect(next.masteryPoints).toBe(105);
    expect(next.currentTier).toBe('Silver');
    expect(tierCrossed).toBe('Silver');
  });

  it('returns null tierCrossed when no threshold is crossed', () => {
    const state = makeState({ masteryPoints: 50, currentTier: 'Bronze' });
    const { next, tierCrossed } = applyAward(state, 10);
    expect(next.masteryPoints).toBe(60);
    expect(next.currentTier).toBe('Bronze');
    expect(tierCrossed).toBeNull();
  });

  it('does not modify state for zero points', () => {
    const state = makeState({ masteryPoints: 50, currentTier: 'Bronze' });
    const { next, tierCrossed } = applyAward(state, 0);
    expect(next.masteryPoints).toBe(50);
    expect(next.currentTier).toBe('Bronze');
    expect(tierCrossed).toBeNull();
  });

  it('does not modify state for negative points (Requirement 7.5)', () => {
    const state = makeState({ masteryPoints: 50, currentTier: 'Bronze' });
    const { next, tierCrossed } = applyAward(state, -10);
    expect(next.masteryPoints).toBe(50);
    expect(next.currentTier).toBe('Bronze');
    expect(tierCrossed).toBeNull();
  });

  it('detects crossing from Bronze to Gold in a single large award', () => {
    const state = makeState({ masteryPoints: 0, currentTier: 'Bronze' });
    const { next, tierCrossed } = applyAward(state, 350);
    expect(next.masteryPoints).toBe(350);
    expect(next.currentTier).toBe('Gold');
    expect(tierCrossed).toBe('Gold');
  });

  it('detects crossing into Diamond', () => {
    const state = makeState({ masteryPoints: 990, currentTier: 'Platinum' });
    const { next, tierCrossed } = applyAward(state, 15);
    expect(next.masteryPoints).toBe(1005);
    expect(next.currentTier).toBe('Diamond');
    expect(tierCrossed).toBe('Diamond');
  });

  it('preserves userId and operatorId', () => {
    const state = makeState({ userId: 'u-42', operatorId: 'ash', masteryPoints: 10 });
    const { next } = applyAward(state, 5);
    expect(next.userId).toBe('u-42');
    expect(next.operatorId).toBe('ash');
  });

  it('does not mutate the original state', () => {
    const state = makeState({ masteryPoints: 50 });
    applyAward(state, 10);
    expect(state.masteryPoints).toBe(50);
  });
});

describe('computeTier (re-exported)', () => {
  it('returns Bronze for 0 points', () => {
    expect(computeTier(0)).toBe('Bronze');
  });

  it('returns Silver for 100 points', () => {
    expect(computeTier(100)).toBe('Silver');
  });

  it('returns Gold for 300 points', () => {
    expect(computeTier(300)).toBe('Gold');
  });

  it('returns Platinum for 600 points', () => {
    expect(computeTier(600)).toBe('Platinum');
  });

  it('returns Diamond for 1000 points', () => {
    expect(computeTier(1000)).toBe('Diamond');
  });
});

describe('pointsToNextTier (re-exported)', () => {
  it('returns 100 for 0 points (Bronze → Silver)', () => {
    expect(pointsToNextTier(0)).toBe(100);
  });

  it('returns 50 for 50 points (Bronze → Silver)', () => {
    expect(pointsToNextTier(50)).toBe(50);
  });

  it('returns 200 for 100 points (Silver → Gold)', () => {
    expect(pointsToNextTier(100)).toBe(200);
  });

  it('returns 0 for 1000 points (Diamond, no next tier)', () => {
    expect(pointsToNextTier(1000)).toBe(0);
  });
});
