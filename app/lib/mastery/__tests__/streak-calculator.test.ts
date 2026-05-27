import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyStreakIncrement, applyStreakReset } from '../streak-calculator';
import { MasteryStreakState } from '@/app/types/mastery';

// Mock crypto.randomUUID for deterministic tests
const mockUUID = 'test-uuid-1234-5678-abcd-ef0123456789';
beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => mockUUID),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeState(overrides: Partial<MasteryStreakState> = {}): MasteryStreakState {
  return {
    userId: 'user-1',
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    runId: 'run-abc',
    bonusesAwardedInRun: [],
    ...overrides,
  };
}

describe('applyStreakIncrement', () => {
  it('starts a new streak at 1 when no previous completion exists', () => {
    const state = makeState();
    const today = new Date(2024, 5, 15); // June 15, 2024

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(1);
    expect(result.next.lastCompletedDate).toBe('2024-06-15');
    expect(result.next.longestStreak).toBe(1);
    expect(result.next.runId).toBe(mockUUID); // new run
    expect(result.bonusEarned).toBeNull();
  });

  it('increments streak on consecutive day', () => {
    const state = makeState({
      currentStreak: 2,
      longestStreak: 5,
      lastCompletedDate: '2024-06-14',
      runId: 'existing-run',
    });
    const today = new Date(2024, 5, 15); // June 15

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(3);
    expect(result.next.lastCompletedDate).toBe('2024-06-15');
    expect(result.next.longestStreak).toBe(5); // unchanged, was already higher
    expect(result.next.runId).toBe('existing-run'); // same run
  });

  it('resets streak to 1 when there is a gap of more than 1 day', () => {
    const state = makeState({
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: '2024-06-10',
      runId: 'old-run',
    });
    const today = new Date(2024, 5, 15); // June 15 (5 day gap)

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(1);
    expect(result.next.lastCompletedDate).toBe('2024-06-15');
    expect(result.next.longestStreak).toBe(10); // preserved
    expect(result.next.runId).toBe(mockUUID); // new run
    expect(result.next.bonusesAwardedInRun).toEqual([]); // cleared
  });

  it('is a no-op when already completed today', () => {
    const state = makeState({
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2024-06-15',
      runId: 'current-run',
      bonusesAwardedInRun: [3],
    });
    const today = new Date(2024, 5, 15); // same day

    const result = applyStreakIncrement(state, today);

    expect(result.next).toBe(state); // exact same reference
    expect(result.bonusEarned).toBeNull();
  });

  it('awards 50 XP bonus at streak milestone 3', () => {
    const state = makeState({
      currentStreak: 2,
      longestStreak: 2,
      lastCompletedDate: '2024-06-14',
      runId: 'run-1',
    });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(3);
    expect(result.bonusEarned).toEqual({ length: 3, xp: 50 });
    expect(result.next.bonusesAwardedInRun).toContain(3);
  });

  it('awards 150 XP bonus at streak milestone 7', () => {
    const state = makeState({
      currentStreak: 6,
      longestStreak: 6,
      lastCompletedDate: '2024-06-14',
      runId: 'run-1',
      bonusesAwardedInRun: [3],
    });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(7);
    expect(result.bonusEarned).toEqual({ length: 7, xp: 150 });
    expect(result.next.bonusesAwardedInRun).toContain(7);
  });

  it('awards 750 XP bonus at streak milestone 30', () => {
    const state = makeState({
      currentStreak: 29,
      longestStreak: 29,
      lastCompletedDate: '2024-06-14',
      runId: 'run-1',
      bonusesAwardedInRun: [3, 7],
    });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(30);
    expect(result.bonusEarned).toEqual({ length: 30, xp: 750 });
    expect(result.next.bonusesAwardedInRun).toContain(30);
  });

  it('does not re-award a bonus already awarded in the same run', () => {
    const state = makeState({
      currentStreak: 2,
      longestStreak: 5,
      lastCompletedDate: '2024-06-14',
      runId: 'run-1',
      bonusesAwardedInRun: [3], // already awarded
    });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(3);
    expect(result.bonusEarned).toBeNull(); // not re-awarded
    expect(result.next.bonusesAwardedInRun).toEqual([3]); // unchanged
  });

  it('updates longestStreak when current exceeds it', () => {
    const state = makeState({
      currentStreak: 4,
      longestStreak: 4,
      lastCompletedDate: '2024-06-14',
      runId: 'run-1',
      bonusesAwardedInRun: [3],
    });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.currentStreak).toBe(5);
    expect(result.next.longestStreak).toBe(5);
  });

  it('preserves userId across operations', () => {
    const state = makeState({ userId: 'user-xyz' });
    const today = new Date(2024, 5, 15);

    const result = applyStreakIncrement(state, today);

    expect(result.next.userId).toBe('user-xyz');
  });
});

describe('applyStreakReset', () => {
  it('resets currentStreak to 0', () => {
    const state = makeState({
      currentStreak: 7,
      longestStreak: 15,
      lastCompletedDate: '2024-06-14',
      runId: 'old-run',
      bonusesAwardedInRun: [3, 7],
    });

    const result = applyStreakReset(state);

    expect(result.currentStreak).toBe(0);
  });

  it('preserves longestStreak', () => {
    const state = makeState({
      currentStreak: 7,
      longestStreak: 15,
    });

    const result = applyStreakReset(state);

    expect(result.longestStreak).toBe(15);
  });

  it('generates a new runId', () => {
    const state = makeState({ runId: 'old-run' });

    const result = applyStreakReset(state);

    expect(result.runId).toBe(mockUUID);
    expect(result.runId).not.toBe('old-run');
  });

  it('clears bonusesAwardedInRun', () => {
    const state = makeState({
      bonusesAwardedInRun: [3, 7, 30],
    });

    const result = applyStreakReset(state);

    expect(result.bonusesAwardedInRun).toEqual([]);
  });

  it('preserves lastCompletedDate for reference', () => {
    const state = makeState({
      lastCompletedDate: '2024-06-14',
    });

    const result = applyStreakReset(state);

    expect(result.lastCompletedDate).toBe('2024-06-14');
  });

  it('preserves userId', () => {
    const state = makeState({ userId: 'user-abc' });

    const result = applyStreakReset(state);

    expect(result.userId).toBe('user-abc');
  });
});
