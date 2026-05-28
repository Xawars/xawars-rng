// app/lib/mastery/persistence.ts
// Persistence layer for the Mastery system.
// Provides conflict resolution strategies, SyncQueue integration for
// authenticated users, and localStorage fallback for guest preview mode.
// Implements Requirements 12.1–12.5, 13.1–13.4.

import { syncQueue } from '../sync-queue';
import type {
  Challenge,
  OperatorMastery,
  MasteryBadge,
  MasteryStreakState,
  MatchResultRow,
} from '@/app/types/mastery';

// --- localStorage Keys ---

const LS_GUEST_CHALLENGE_KEY = 'xawars_mastery_guest_challenge';
const LS_CHALLENGES_KEY = 'xawars_mastery_challenges';
const LS_OPERATOR_MASTERY_KEY = 'xawars_mastery_operator_mastery';
const LS_BADGES_KEY = 'xawars_mastery_badges';
const LS_STREAK_KEY = 'xawars_mastery_streak';
const LS_MATCH_RESULTS_KEY = 'xawars_mastery_match_results';

// --- Conflict Resolution ---

/**
 * Max-merge conflict resolution for monotonic counters.
 * Used for mastery_points and challenge_progress which only ever increase.
 * Returns the larger of the two values.
 *
 * Requirement 12.4: WHEN a Mastery sync conflict occurs for a numeric counter
 * (Mastery_Points, Challenge_Progress), THE Database_Service SHALL resolve the
 * conflict by keeping the larger value (max-merge).
 */
export function maxMerge(local: number, remote: number): number {
  return Math.max(local, remote);
}

/**
 * Latest-timestamp conflict resolution for Match_Result rows.
 * Returns the row with the more recent updated_at timestamp.
 * On tie, local wins (consistent with existing optimistic-local-first policy).
 *
 * Requirement 12.5: WHEN a Mastery sync conflict occurs for a Match_Result on
 * a Deployment, THE Database_Service SHALL resolve it by keeping the value with
 * the more recent timestamp.
 */
export function latestTimestampMerge(
  local: MatchResultRow,
  remote: MatchResultRow
): MatchResultRow {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();
  // Local wins on tie (optimistic-local-first)
  return localTime >= remoteTime ? local : remote;
}

// --- SyncQueue Persistence (Authenticated Users) ---

/**
 * Persist a challenge through the SyncQueue.
 * Uses upsert with the challenge id as the conflict key.
 *
 * Requirement 12.1: persist within 5 seconds via existing SyncQueue.
 */
export function persistChallenge(challenge: Challenge): void {
  syncQueue.enqueue({
    table: 'challenges',
    operation: 'upsert',
    payload: {
      id: challenge.id,
      user_id: challenge.userId,
      slot: challenge.slot,
      role: challenge.role,
      objective: challenge.objective,
      target_count: challenge.targetCount,
      restriction_kind: challenge.restriction?.kind ?? null,
      restriction_value: challenge.restriction?.value ?? null,
      operator_scope: challenge.operatorScope,
      operator_pool: challenge.operatorPool,
      xp_reward: challenge.xpReward,
      mastery_point_reward: challenge.masteryPointReward,
      xp_override: challenge.xpOverride,
      xp_override_reason: challenge.xpOverrideReason,
      progress: challenge.progress,
      generated_at: challenge.generatedAt,
      expires_at: challenge.expiresAt,
      completed_at: challenge.completedAt,
      discarded_at: challenge.discardedAt,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * Persist challenge progress update through the SyncQueue.
 * Uses max-merge semantics: the payload carries the new progress value,
 * and the SyncQueue's conflict handler will compare timestamps. Since
 * progress is monotonically non-decreasing, the larger value always wins.
 *
 * Requirement 12.4: max-merge for Challenge_Progress.
 */
export function persistChallengeProgress(
  challengeId: string,
  userId: string,
  progress: number
): void {
  syncQueue.enqueue({
    table: 'challenges',
    operation: 'upsert',
    payload: {
      id: challengeId,
      user_id: userId,
      progress,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * Persist operator mastery state through the SyncQueue.
 * Uses max-merge semantics for mastery_points (monotonically non-decreasing).
 *
 * Requirement 12.4: max-merge for Mastery_Points.
 */
export function persistOperatorMastery(mastery: OperatorMastery): void {
  syncQueue.enqueue({
    table: 'operator_mastery',
    operation: 'upsert',
    payload: {
      user_id: mastery.userId,
      operator_id: mastery.operatorId,
      mastery_points: mastery.masteryPoints,
      current_tier: mastery.currentTier,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * Persist a mastery badge through the SyncQueue.
 * Uses insert; the UNIQUE (user_id, operator_id, tier) constraint
 * means a conflict (23505) is treated as success by the SyncQueue
 * conflict handler — the badge already exists.
 *
 * Requirement 8.5: at most one badge per (user, operator, tier).
 */
export function persistMasteryBadge(badge: MasteryBadge): void {
  syncQueue.enqueue({
    table: 'mastery_badges',
    operation: 'insert',
    payload: {
      id: badge.id,
      user_id: badge.userId,
      operator_id: badge.operatorId,
      tier: badge.tier,
      unlocked_at: badge.unlockedAt,
    },
  });
}

/**
 * Persist mastery streak state through the SyncQueue.
 *
 * Requirement 9.4: persist streak state in the Database_Service.
 */
export function persistMasteryStreak(streak: MasteryStreakState): void {
  syncQueue.enqueue({
    table: 'mastery_streak',
    operation: 'upsert',
    payload: {
      user_id: streak.userId,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_completed_date: streak.lastCompletedDate,
      run_id: streak.runId,
      bonuses_awarded_in_run: streak.bonusesAwardedInRun,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * Persist a match result through the SyncQueue.
 * Uses latest-timestamp conflict resolution: the row with the larger
 * updated_at wins on conflict.
 *
 * Requirement 12.5: latest-timestamp for Match_Result.
 */
export function persistMatchResult(matchResult: MatchResultRow): void {
  syncQueue.enqueue({
    table: 'match_results',
    operation: 'upsert',
    payload: {
      deployment_id: matchResult.deploymentId,
      user_id: matchResult.userId,
      result: matchResult.result,
      reported_at: matchResult.reportedAt,
      updated_at: matchResult.updatedAt,
    },
  });
}

/**
 * Persist the denormalized match_result column on the deployments table.
 * Kept in sync with the match_results table for fast rendering.
 */
export function persistDeploymentMatchResult(
  deploymentId: string,
  result: string
): void {
  syncQueue.enqueue({
    table: 'deployments',
    operation: 'upsert',
    payload: {
      id: deploymentId,
      match_result: result,
      updated_at: new Date().toISOString(),
    },
  });
}

// --- localStorage Helpers (shared between guest and cache) ---

/**
 * Safely read JSON from localStorage.
 */
export function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely write JSON to localStorage.
 */
export function writeLocalStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

// --- Guest Mode Persistence ---
// Guest users see a single example daily challenge with progress tracked
// in localStorage. No XP, Mastery_Points, or Mastery_Badges are awarded.
// Requirement 13.1, 13.2.

/**
 * Load the guest's example daily challenge from localStorage.
 * Returns null if no challenge is stored or data is corrupted.
 */
export function loadGuestChallenge(): Challenge | null {
  return readLocalStorage<Challenge | null>(LS_GUEST_CHALLENGE_KEY, null);
}

/**
 * Save the guest's example daily challenge to localStorage.
 * Only progress is tracked; no XP or mastery awards.
 *
 * Requirement 13.2: track progress in localStorage but do NOT award XP,
 * Mastery_Points, or Mastery_Badges.
 */
export function saveGuestChallenge(challenge: Challenge): void {
  writeLocalStorage(LS_GUEST_CHALLENGE_KEY, challenge);
}

/**
 * Clear all guest mastery state from localStorage.
 * Called on sign-up/login to discard the guest preview.
 *
 * Requirement 13.4: discard locally tracked example Challenge_Progress
 * on sign-up or first login.
 */
export function clearGuestState(): void {
  removeLocalStorage(LS_GUEST_CHALLENGE_KEY);
}

// --- Authenticated Local Cache ---
// Local cache provides fast UI rendering while SyncQueue handles
// eventual consistency with Supabase.

/**
 * Save challenges to local cache for fast hydration.
 */
export function cacheChallenges(challenges: Challenge[]): void {
  writeLocalStorage(LS_CHALLENGES_KEY, challenges);
}

/**
 * Load cached challenges from localStorage.
 */
export function loadCachedChallenges(): Challenge[] {
  return readLocalStorage<Challenge[]>(LS_CHALLENGES_KEY, []);
}

/**
 * Save operator mastery map to local cache.
 */
export function cacheOperatorMastery(mastery: Record<string, OperatorMastery>): void {
  writeLocalStorage(LS_OPERATOR_MASTERY_KEY, mastery);
}

/**
 * Load cached operator mastery from localStorage.
 */
export function loadCachedOperatorMastery(): Record<string, OperatorMastery> {
  return readLocalStorage<Record<string, OperatorMastery>>(LS_OPERATOR_MASTERY_KEY, {});
}

/**
 * Save badges to local cache.
 */
export function cacheBadges(badges: MasteryBadge[]): void {
  writeLocalStorage(LS_BADGES_KEY, badges);
}

/**
 * Load cached badges from localStorage.
 */
export function loadCachedBadges(): MasteryBadge[] {
  return readLocalStorage<MasteryBadge[]>(LS_BADGES_KEY, []);
}

/**
 * Save streak state to local cache.
 */
export function cacheStreak(streak: MasteryStreakState): void {
  writeLocalStorage(LS_STREAK_KEY, streak);
}

/**
 * Load cached streak state from localStorage.
 */
export function loadCachedStreak(): MasteryStreakState | null {
  return readLocalStorage<MasteryStreakState | null>(LS_STREAK_KEY, null);
}

/**
 * Save match results to local cache.
 */
export function cacheMatchResults(results: Record<string, MatchResultRow>): void {
  writeLocalStorage(LS_MATCH_RESULTS_KEY, results);
}

/**
 * Load cached match results from localStorage.
 */
export function loadCachedMatchResults(): Record<string, MatchResultRow> {
  return readLocalStorage<Record<string, MatchResultRow>>(LS_MATCH_RESULTS_KEY, {});
}

/**
 * Clear all authenticated mastery cache from localStorage.
 * Used on logout to prevent stale data from appearing for a different user.
 */
export function clearAuthenticatedCache(): void {
  removeLocalStorage(LS_CHALLENGES_KEY);
  removeLocalStorage(LS_OPERATOR_MASTERY_KEY);
  removeLocalStorage(LS_BADGES_KEY);
  removeLocalStorage(LS_STREAK_KEY);
  removeLocalStorage(LS_MATCH_RESULTS_KEY);
}
