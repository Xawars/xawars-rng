import { isCompleted, computeEffectiveXpReward } from '@/app/lib/mastery/challenge-engine';
import { canonicalXpReward } from '@/app/lib/mastery/xp-invariant';
import type { Challenge } from '@/app/types/mastery';

/**
 * Unit tests for isCompleted and computeEffectiveXpReward.
 *
 * Validates: Requirements 5.1, 5.5, 16.6
 */

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'test-id',
    userId: 'user-1',
    slot: 'daily',
    role: null,
    objective: 'complete_deployments',
    targetCount: 5,
    restriction: null,
    operatorScope: 'any',
    operatorPool: [],
    xpReward: 50,
    masteryPointReward: 25,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 0,
    generatedAt: new Date().toISOString(),
    expiresAt: null,
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

describe('isCompleted', () => {
  it('returns false when progress is 0 and targetCount is 5', () => {
    const challenge = makeChallenge({ progress: 0, targetCount: 5 });
    expect(isCompleted(challenge)).toBe(false);
  });

  it('returns false when progress is less than targetCount', () => {
    const challenge = makeChallenge({ progress: 4, targetCount: 5 });
    expect(isCompleted(challenge)).toBe(false);
  });

  it('returns true when progress equals targetCount', () => {
    const challenge = makeChallenge({ progress: 5, targetCount: 5 });
    expect(isCompleted(challenge)).toBe(true);
  });

  it('returns true when progress exceeds targetCount', () => {
    const challenge = makeChallenge({ progress: 6, targetCount: 5 });
    expect(isCompleted(challenge)).toBe(true);
  });

  it('returns true when targetCount is 1 and progress is 1', () => {
    const challenge = makeChallenge({ progress: 1, targetCount: 1 });
    expect(isCompleted(challenge)).toBe(true);
  });
});

describe('computeEffectiveXpReward', () => {
  it('returns canonical XP when xpOverride is null', () => {
    const challenge = makeChallenge({
      slot: 'daily',
      targetCount: 5,
      xpOverride: null,
      xpOverrideReason: null,
    });
    expect(computeEffectiveXpReward(challenge)).toBe(canonicalXpReward('daily', 5));
    expect(computeEffectiveXpReward(challenge)).toBe(50);
  });

  it('returns canonical XP for weekly slot without override', () => {
    const challenge = makeChallenge({
      slot: 'weekly',
      targetCount: 10,
      xpOverride: null,
      xpOverrideReason: null,
    });
    expect(computeEffectiveXpReward(challenge)).toBe(canonicalXpReward('weekly', 10));
    expect(computeEffectiveXpReward(challenge)).toBe(150);
  });

  it('returns canonical XP for mission slot without override', () => {
    const challenge = makeChallenge({
      slot: 'mission',
      targetCount: 8,
      xpOverride: null,
      xpOverrideReason: null,
    });
    expect(computeEffectiveXpReward(challenge)).toBe(canonicalXpReward('mission', 8));
    expect(computeEffectiveXpReward(challenge)).toBe(96);
  });

  it('returns xpOverride when both xpOverride and xpOverrideReason are non-null', () => {
    const challenge = makeChallenge({
      slot: 'daily',
      targetCount: 5,
      xpOverride: 200,
      xpOverrideReason: 'Admin bonus for event',
    });
    expect(computeEffectiveXpReward(challenge)).toBe(200);
  });

  it('returns canonical XP when xpOverride is set but xpOverrideReason is null (orphan)', () => {
    const challenge = makeChallenge({
      slot: 'daily',
      targetCount: 5,
      xpOverride: 200,
      xpOverrideReason: null,
    });
    // Orphan state: only override set, no reason — falls back to canonical
    expect(computeEffectiveXpReward(challenge)).toBe(canonicalXpReward('daily', 5));
    expect(computeEffectiveXpReward(challenge)).toBe(50);
  });

  it('returns canonical XP when xpOverrideReason is set but xpOverride is null (orphan)', () => {
    const challenge = makeChallenge({
      slot: 'weekly',
      targetCount: 10,
      xpOverride: null,
      xpOverrideReason: 'Some reason without override value',
    });
    // Orphan state: only reason set, no override — falls back to canonical
    expect(computeEffectiveXpReward(challenge)).toBe(canonicalXpReward('weekly', 10));
    expect(computeEffectiveXpReward(challenge)).toBe(150);
  });

  it('returns xpOverride of 0 when valid Administrative_Exception with zero override', () => {
    const challenge = makeChallenge({
      slot: 'mission',
      targetCount: 50,
      xpOverride: 0,
      xpOverrideReason: 'Zero XP penalty for testing',
    });
    expect(computeEffectiveXpReward(challenge)).toBe(0);
  });
});
