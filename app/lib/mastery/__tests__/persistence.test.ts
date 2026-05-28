// app/lib/mastery/__tests__/persistence.test.ts
// Unit tests for the mastery persistence layer.
// Tests conflict resolution strategies, SyncQueue integration,
// and localStorage fallback for guest mode.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  maxMerge,
  latestTimestampMerge,
  persistChallenge,
  persistChallengeProgress,
  persistOperatorMastery,
  persistMasteryBadge,
  persistMasteryStreak,
  persistMatchResult,
  persistDeploymentMatchResult,
  loadGuestChallenge,
  saveGuestChallenge,
  clearGuestState,
  cacheChallenges,
  loadCachedChallenges,
  cacheOperatorMastery,
  loadCachedOperatorMastery,
  cacheBadges,
  loadCachedBadges,
  cacheStreak,
  loadCachedStreak,
  cacheMatchResults,
  loadCachedMatchResults,
  clearAuthenticatedCache,
  readLocalStorage,
  writeLocalStorage,
  removeLocalStorage,
} from '../persistence';
import { syncQueue } from '../../sync-queue';
import type {
  Challenge,
  OperatorMastery,
  MasteryBadge,
  MasteryStreakState,
  MatchResultRow,
} from '@/app/types/mastery';

// Mock the sync-queue module
vi.mock('../../sync-queue', () => ({
  syncQueue: {
    enqueue: vi.fn(),
  },
}));

// --- Test Fixtures ---

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-1',
    userId: 'user-1',
    slot: 'daily',
    role: 'Entry Fragger',
    objective: 'complete_deployments',
    targetCount: 3,
    restriction: null,
    operatorScope: 'any',
    operatorPool: [],
    xpReward: 30,
    masteryPointReward: 15,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 1,
    generatedAt: '2024-01-15T08:00:00.000Z',
    expiresAt: '2024-01-16T00:00:00.000Z',
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

function makeOperatorMastery(overrides: Partial<OperatorMastery> = {}): OperatorMastery {
  return {
    userId: 'user-1',
    operatorId: 'ash',
    masteryPoints: 150,
    currentTier: 'Silver',
    ...overrides,
  };
}

function makeBadge(overrides: Partial<MasteryBadge> = {}): MasteryBadge {
  return {
    id: 'badge-1',
    userId: 'user-1',
    operatorId: 'ash',
    tier: 'Silver',
    unlockedAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeStreak(overrides: Partial<MasteryStreakState> = {}): MasteryStreakState {
  return {
    userId: 'user-1',
    currentStreak: 5,
    longestStreak: 7,
    lastCompletedDate: '2024-01-15',
    runId: 'run-abc',
    bonusesAwardedInRun: [3],
    ...overrides,
  };
}

function makeMatchResult(overrides: Partial<MatchResultRow> = {}): MatchResultRow {
  return {
    deploymentId: 'deploy-1',
    userId: 'user-1',
    result: 'win',
    reportedAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// --- Tests ---

describe('Conflict Resolution', () => {
  describe('maxMerge', () => {
    it('returns the larger of two positive values', () => {
      expect(maxMerge(10, 20)).toBe(20);
      expect(maxMerge(20, 10)).toBe(20);
    });

    it('returns the value when both are equal', () => {
      expect(maxMerge(15, 15)).toBe(15);
    });

    it('handles zero values', () => {
      expect(maxMerge(0, 5)).toBe(5);
      expect(maxMerge(5, 0)).toBe(5);
      expect(maxMerge(0, 0)).toBe(0);
    });

    it('handles large values for mastery_points', () => {
      expect(maxMerge(999, 1000)).toBe(1000);
      expect(maxMerge(1000, 999)).toBe(1000);
    });
  });

  describe('latestTimestampMerge', () => {
    it('returns the row with the more recent updatedAt', () => {
      const local = makeMatchResult({ updatedAt: '2024-01-15T10:00:00.000Z' });
      const remote = makeMatchResult({ updatedAt: '2024-01-15T10:05:00.000Z', result: 'loss' });

      const winner = latestTimestampMerge(local, remote);
      expect(winner).toBe(remote);
      expect(winner.result).toBe('loss');
    });

    it('returns local when local is more recent', () => {
      const local = makeMatchResult({ updatedAt: '2024-01-15T10:10:00.000Z' });
      const remote = makeMatchResult({ updatedAt: '2024-01-15T10:05:00.000Z', result: 'loss' });

      const winner = latestTimestampMerge(local, remote);
      expect(winner).toBe(local);
      expect(winner.result).toBe('win');
    });

    it('returns local on tie (optimistic-local-first)', () => {
      const local = makeMatchResult({ updatedAt: '2024-01-15T10:00:00.000Z', result: 'win' });
      const remote = makeMatchResult({ updatedAt: '2024-01-15T10:00:00.000Z', result: 'loss' });

      const winner = latestTimestampMerge(local, remote);
      expect(winner).toBe(local);
      expect(winner.result).toBe('win');
    });
  });
});

describe('SyncQueue Persistence (Authenticated Users)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persistChallenge enqueues an upsert to the challenges table', () => {
    const challenge = makeChallenge();
    persistChallenge(challenge);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('challenges');
    expect(call.operation).toBe('upsert');
    expect(call.payload.id).toBe('challenge-1');
    expect(call.payload.user_id).toBe('user-1');
    expect(call.payload.slot).toBe('daily');
    expect(call.payload.progress).toBe(1);
    expect(call.payload.updated_at).toBeDefined();
  });

  it('persistChallengeProgress enqueues a progress upsert with max-merge semantics', () => {
    persistChallengeProgress('challenge-1', 'user-1', 5);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('challenges');
    expect(call.operation).toBe('upsert');
    expect(call.payload.id).toBe('challenge-1');
    expect(call.payload.progress).toBe(5);
    expect(call.payload.updated_at).toBeDefined();
  });

  it('persistOperatorMastery enqueues an upsert to operator_mastery', () => {
    const mastery = makeOperatorMastery();
    persistOperatorMastery(mastery);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('operator_mastery');
    expect(call.operation).toBe('upsert');
    expect(call.payload.user_id).toBe('user-1');
    expect(call.payload.operator_id).toBe('ash');
    expect(call.payload.mastery_points).toBe(150);
    expect(call.payload.current_tier).toBe('Silver');
  });

  it('persistMasteryBadge enqueues an insert to mastery_badges', () => {
    const badge = makeBadge();
    persistMasteryBadge(badge);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('mastery_badges');
    expect(call.operation).toBe('insert');
    expect(call.payload.id).toBe('badge-1');
    expect(call.payload.user_id).toBe('user-1');
    expect(call.payload.operator_id).toBe('ash');
    expect(call.payload.tier).toBe('Silver');
  });

  it('persistMasteryStreak enqueues an upsert to mastery_streak', () => {
    const streak = makeStreak();
    persistMasteryStreak(streak);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('mastery_streak');
    expect(call.operation).toBe('upsert');
    expect(call.payload.user_id).toBe('user-1');
    expect(call.payload.current_streak).toBe(5);
    expect(call.payload.longest_streak).toBe(7);
    expect(call.payload.run_id).toBe('run-abc');
    expect(call.payload.bonuses_awarded_in_run).toEqual([3]);
  });

  it('persistMatchResult enqueues an upsert to match_results with latest-timestamp semantics', () => {
    const result = makeMatchResult();
    persistMatchResult(result);

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('match_results');
    expect(call.operation).toBe('upsert');
    expect(call.payload.deployment_id).toBe('deploy-1');
    expect(call.payload.result).toBe('win');
    expect(call.payload.updated_at).toBe('2024-01-15T10:00:00.000Z');
  });

  it('persistDeploymentMatchResult enqueues an upsert to deployments', () => {
    persistDeploymentMatchResult('deploy-1', 'win');

    expect(syncQueue.enqueue).toHaveBeenCalledTimes(1);
    const call = (syncQueue.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.table).toBe('deployments');
    expect(call.operation).toBe('upsert');
    expect(call.payload.id).toBe('deploy-1');
    expect(call.payload.match_result).toBe('win');
  });
});

describe('localStorage Helpers', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readLocalStorage', () => {
    it('returns fallback when key does not exist', () => {
      expect(readLocalStorage('nonexistent', 42)).toBe(42);
    });

    it('parses stored JSON correctly', () => {
      storage['test_key'] = JSON.stringify({ a: 1 });
      expect(readLocalStorage('test_key', {})).toEqual({ a: 1 });
    });

    it('returns fallback on invalid JSON', () => {
      storage['bad_json'] = 'not valid json{{{';
      expect(readLocalStorage('bad_json', 'default')).toBe('default');
    });
  });

  describe('writeLocalStorage', () => {
    it('writes JSON to localStorage', () => {
      writeLocalStorage('test_key', { hello: 'world' });
      expect(storage['test_key']).toBe(JSON.stringify({ hello: 'world' }));
    });

    it('silently fails on quota exceeded', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      // Should not throw
      expect(() => writeLocalStorage('key', 'value')).not.toThrow();
    });
  });

  describe('removeLocalStorage', () => {
    it('removes a key from localStorage', () => {
      storage['to_remove'] = 'value';
      removeLocalStorage('to_remove');
      expect(storage['to_remove']).toBeUndefined();
    });
  });
});

describe('Guest Mode Persistence', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loadGuestChallenge returns null when no challenge stored', () => {
    expect(loadGuestChallenge()).toBeNull();
  });

  it('saveGuestChallenge and loadGuestChallenge round-trip correctly', () => {
    const challenge = makeChallenge({ userId: 'guest' });
    saveGuestChallenge(challenge);
    const loaded = loadGuestChallenge();
    expect(loaded).toEqual(challenge);
  });

  it('clearGuestState removes the guest challenge key', () => {
    const challenge = makeChallenge({ userId: 'guest' });
    saveGuestChallenge(challenge);
    expect(loadGuestChallenge()).not.toBeNull();

    clearGuestState();
    expect(loadGuestChallenge()).toBeNull();
  });

  it('guest persistence does NOT call syncQueue.enqueue', () => {
    const challenge = makeChallenge({ userId: 'guest' });
    saveGuestChallenge(challenge);
    expect(syncQueue.enqueue).not.toHaveBeenCalled();
  });
});

describe('Authenticated Local Cache', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cacheChallenges and loadCachedChallenges round-trip', () => {
    const challenges = [makeChallenge(), makeChallenge({ id: 'challenge-2', slot: 'weekly' })];
    cacheChallenges(challenges);
    expect(loadCachedChallenges()).toEqual(challenges);
  });

  it('loadCachedChallenges returns empty array when nothing cached', () => {
    expect(loadCachedChallenges()).toEqual([]);
  });

  it('cacheOperatorMastery and loadCachedOperatorMastery round-trip', () => {
    const mastery = { ash: makeOperatorMastery() };
    cacheOperatorMastery(mastery);
    expect(loadCachedOperatorMastery()).toEqual(mastery);
  });

  it('cacheBadges and loadCachedBadges round-trip', () => {
    const badges = [makeBadge()];
    cacheBadges(badges);
    expect(loadCachedBadges()).toEqual(badges);
  });

  it('cacheStreak and loadCachedStreak round-trip', () => {
    const streak = makeStreak();
    cacheStreak(streak);
    expect(loadCachedStreak()).toEqual(streak);
  });

  it('loadCachedStreak returns null when nothing cached', () => {
    expect(loadCachedStreak()).toBeNull();
  });

  it('cacheMatchResults and loadCachedMatchResults round-trip', () => {
    const results = { 'deploy-1': makeMatchResult() };
    cacheMatchResults(results);
    expect(loadCachedMatchResults()).toEqual(results);
  });

  it('clearAuthenticatedCache removes all mastery cache keys', () => {
    cacheChallenges([makeChallenge()]);
    cacheOperatorMastery({ ash: makeOperatorMastery() });
    cacheBadges([makeBadge()]);
    cacheStreak(makeStreak());
    cacheMatchResults({ 'deploy-1': makeMatchResult() });

    clearAuthenticatedCache();

    expect(loadCachedChallenges()).toEqual([]);
    expect(loadCachedOperatorMastery()).toEqual({});
    expect(loadCachedBadges()).toEqual([]);
    expect(loadCachedStreak()).toBeNull();
    expect(loadCachedMatchResults()).toEqual({});
  });
});
