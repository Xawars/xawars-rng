'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { syncQueue } from '../lib/sync-queue';
import { useAuth } from './AuthContext';
import {
  generateDaily,
  generateWeekly,
  generateOperatorMissions,
  evaluateEligibility,
  applyDeploymentProgress,
  applyMatchResultProgress,
  applyKillIncrement,
  isCompleted,
  computeEffectiveXpReward,
} from '../lib/mastery/challenge-engine';
import { pointsFor, applyAward, computeTier as computeTierFromPoints } from '../lib/mastery/mastery-engine';
import { applyStreakIncrement } from '../lib/mastery/streak-calculator';
import type {
  Challenge,
  OperatorMastery,
  MasteryBadge,
  MasteryStreakState,
  MatchResult,
  MatchResultRow,
  MatchResultReportOutcome,
  ActivateResult,
  MasteryTier,
  XPSource,
} from '../types/mastery';
import type { DeploymentRecord } from '../types/database';
import { useData } from './DataContext';

// --- localStorage Keys ---

const LS_GUEST_CHALLENGE_KEY = 'xawars_mastery_guest_challenge';
const LS_CHALLENGES_KEY = 'xawars_mastery_challenges';
const LS_OPERATOR_MASTERY_KEY = 'xawars_mastery_operator_mastery';
const LS_BADGES_KEY = 'xawars_mastery_badges';
const LS_STREAK_KEY = 'xawars_mastery_streak';
const LS_LAST_DAILY_REFRESH_KEY = 'xawars_mastery_last_daily_refresh';
const LS_LAST_WEEKLY_REFRESH_KEY = 'xawars_mastery_last_weekly_refresh';
const LS_MATCH_RESULTS_KEY = 'xawars_mastery_match_results';

// --- Constants ---

/** 10-minute mutability window for match results (in milliseconds). */
const MATCH_RESULT_MUTABILITY_WINDOW_MS = 10 * 60 * 1000;

// --- Context Interface ---

export interface MasteryContextValue {
  // Active state
  dailyChallenge: Challenge | null;
  weeklyChallenge: Challenge | null;
  activeOperatorMissions: Challenge[];
  availableOperatorMissions: (operatorId: string) => Challenge[];
  operatorMastery: Record<string, OperatorMastery>;
  masteryBadges: MasteryBadge[];
  masteryStreak: MasteryStreakState;

  // Lifecycle hooks (called by existing roll/deployment flow)
  onDeploymentAccepted: (deployment: DeploymentRecord) => Promise<void>;
  onKillIncremented: (deploymentId: string, operatorId: string, delta: 1 | -1) => Promise<void>;
  reportMatchResult: (deploymentId: string, result: MatchResult) => Promise<MatchResultReportOutcome>;

  // User actions
  activateOperatorMission: (challengeId: string) => Promise<ActivateResult>;
  discardChallenge: (challengeId: string) => Promise<void>;
  refreshChallenges: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

// --- Default Streak State ---

const DEFAULT_STREAK: MasteryStreakState = {
  userId: '',
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  runId: '',
  bonusesAwardedInRun: [],
};

// --- Context ---

const MasteryContext = createContext<MasteryContextValue | undefined>(undefined);

// --- Helpers ---

/**
 * Get the local calendar date string (YYYY-MM-DD) for a Date.
 */
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a challenge has expired based on its expiresAt field.
 */
function isChallengeExpired(challenge: Challenge): boolean {
  if (!challenge.expiresAt) return false;
  return new Date(challenge.expiresAt).getTime() < Date.now();
}

/**
 * Check if a challenge is still active (not completed, not discarded, not expired).
 */
function isChallengeActive(challenge: Challenge): boolean {
  if (challenge.completedAt !== null) return false;
  if (challenge.discardedAt !== null) return false;
  if (isChallengeExpired(challenge)) return false;
  return true;
}

/**
 * Safely read JSON from localStorage.
 */
function readLocalStorage<T>(key: string, fallback: T): T {
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
function writeLocalStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

// --- Supabase Fetch Helpers ---

async function fetchChallengesFromCloud(userId: string): Promise<Challenge[] | null> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId)
      .is('completed_at', null)
      .is('discarded_at', null);

    if (error || !data) return null;

    return data.map(mapChallengeRow);
  } catch {
    return null;
  }
}

async function fetchOperatorMasteryFromCloud(
  userId: string
): Promise<Record<string, OperatorMastery> | null> {
  try {
    const { data, error } = await supabase
      .from('operator_mastery')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return null;

    const result: Record<string, OperatorMastery> = {};
    for (const row of data) {
      result[row.operator_id] = {
        userId: row.user_id,
        operatorId: row.operator_id,
        masteryPoints: row.mastery_points,
        currentTier: row.current_tier,
      };
    }
    return result;
  } catch {
    return null;
  }
}

async function fetchBadgesFromCloud(userId: string): Promise<MasteryBadge[] | null> {
  try {
    const { data, error } = await supabase
      .from('mastery_badges')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      operatorId: row.operator_id,
      tier: row.tier,
      unlockedAt: row.unlocked_at,
    }));
  } catch {
    return null;
  }
}

async function fetchStreakFromCloud(userId: string): Promise<MasteryStreakState | null> {
  try {
    const { data, error } = await supabase
      .from('mastery_streak')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastCompletedDate: data.last_completed_date,
      runId: data.run_id,
      bonusesAwardedInRun: data.bonuses_awarded_in_run ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Map a Supabase challenge row to the Challenge interface.
 */
function mapChallengeRow(row: Record<string, unknown>): Challenge {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    slot: row.slot as Challenge['slot'],
    role: (row.role as string) ?? null,
    objective: row.objective as Challenge['objective'],
    targetCount: row.target_count as number,
    restriction: row.restriction_kind
      ? { kind: row.restriction_kind as Challenge['restriction'] extends null ? never : NonNullable<Challenge['restriction']>['kind'], value: row.restriction_value as string }
      : null,
    operatorScope: row.operator_scope as Challenge['operatorScope'],
    operatorPool: (row.operator_pool as string[]) ?? [],
    xpReward: row.xp_reward as number,
    masteryPointReward: row.mastery_point_reward as number,
    xpOverride: (row.xp_override as number) ?? null,
    xpOverrideReason: (row.xp_override_reason as string) ?? null,
    progress: row.progress as number,
    generatedAt: row.generated_at as string,
    expiresAt: (row.expires_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    discardedAt: (row.discarded_at as string) ?? null,
  };
}

// --- Provider ---

export function MasteryProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const { deploymentHistory } = useData();

  // In-memory cache
  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState<Challenge | null>(null);
  const [activeOperatorMissions, setActiveOperatorMissions] = useState<Challenge[]>([]);
  const [operatorMastery, setOperatorMastery] = useState<Record<string, OperatorMastery>>({});
  const [masteryBadges, setMasteryBadges] = useState<MasteryBadge[]>([]);
  const [masteryStreak, setMasteryStreak] = useState<MasteryStreakState>(DEFAULT_STREAK);
  const [isLoading, setIsLoading] = useState(true);

  // Match results cache: tracks reported results and their timestamps for the mutability window
  const matchResultsRef = useRef<Record<string, MatchResultRow>>({});

  // Track which deployments contributed to which challenges (for mastery point awards on completion)
  const challengeContributorsRef = useRef<Record<string, Set<string>>>({});

  // Track hydration to avoid re-fetching
  const hydratedUserRef = useRef<string | null>(null);

  // Cache for generated (available) missions so they can be activated by id
  const generatedMissionsRef = useRef<Map<string, Challenge>>(new Map());

  // --- Hydration: Load from Supabase (authenticated) or localStorage (guest) ---

  useEffect(() => {
    if (authLoading) return;

    if (isGuest || !user) {
      // Guest mode: load single example challenge from localStorage
      hydrateGuestState();
      return;
    }

    if (hydratedUserRef.current === user.id) return;

    hydrateAuthenticatedState(user.id);
  }, [user, isGuest, authLoading]);

  /**
   * Hydrate state for guest users from localStorage.
   * Guests see a single example daily challenge with no XP/mastery awards.
   */
  function hydrateGuestState() {
    const guestChallenge = readLocalStorage<Challenge | null>(LS_GUEST_CHALLENGE_KEY, null);
    if (guestChallenge && isChallengeActive(guestChallenge)) {
      setDailyChallenge(guestChallenge);
    } else {
      // Generate a new guest preview challenge
      const result = generateDaily('guest', new Date());
      if (result.challenge) {
        const challenge = { ...result.challenge, userId: 'guest' };
        setDailyChallenge(challenge);
        writeLocalStorage(LS_GUEST_CHALLENGE_KEY, challenge);
      }
    }
    setWeeklyChallenge(null);
    setActiveOperatorMissions([]);
    setOperatorMastery({});
    setMasteryBadges([]);
    setMasteryStreak({ ...DEFAULT_STREAK, userId: 'guest' });
    setIsLoading(false);
  }

  /**
   * Hydrate state for authenticated users.
   * Reads from local cache first, then falls back to Supabase.
   */
  async function hydrateAuthenticatedState(userId: string) {
    setIsLoading(true);

    // Try local cache first for immediate display
    const cachedChallenges = readLocalStorage<Challenge[]>(LS_CHALLENGES_KEY, []);
    const cachedMastery = readLocalStorage<Record<string, OperatorMastery>>(LS_OPERATOR_MASTERY_KEY, {});
    const cachedBadges = readLocalStorage<MasteryBadge[]>(LS_BADGES_KEY, []);
    const cachedStreak = readLocalStorage<MasteryStreakState | null>(LS_STREAK_KEY, null);

    // Apply cached state immediately for fast UI
    if (cachedChallenges.length > 0) {
      applyChallengesState(cachedChallenges);
    }
    if (Object.keys(cachedMastery).length > 0) {
      setOperatorMastery(cachedMastery);
    }
    if (cachedBadges.length > 0) {
      setMasteryBadges(cachedBadges);
    }
    if (cachedStreak) {
      setMasteryStreak(cachedStreak);
    }

    // Load cached match results for the mutability window
    const cachedMatchResults = readLocalStorage<Record<string, MatchResultRow>>(LS_MATCH_RESULTS_KEY, {});
    matchResultsRef.current = cachedMatchResults;

    // Fetch from Supabase (source of truth for authenticated users)
    const [cloudChallenges, cloudMastery, cloudBadges, cloudStreak] = await Promise.all([
      fetchChallengesFromCloud(userId),
      fetchOperatorMasteryFromCloud(userId),
      fetchBadgesFromCloud(userId),
      fetchStreakFromCloud(userId),
    ]);

    // Apply cloud data (overrides local cache)
    if (cloudChallenges) {
      applyChallengesState(cloudChallenges);
      writeLocalStorage(LS_CHALLENGES_KEY, cloudChallenges);
    }
    if (cloudMastery) {
      setOperatorMastery(cloudMastery);
      writeLocalStorage(LS_OPERATOR_MASTERY_KEY, cloudMastery);
    }
    if (cloudBadges) {
      setMasteryBadges(cloudBadges);
      writeLocalStorage(LS_BADGES_KEY, cloudBadges);
    }
    if (cloudStreak) {
      setMasteryStreak(cloudStreak);
      writeLocalStorage(LS_STREAK_KEY, cloudStreak);
    } else {
      // Initialize streak state for new users
      const initialStreak: MasteryStreakState = { ...DEFAULT_STREAK, userId };
      setMasteryStreak(initialStreak);
    }

    hydratedUserRef.current = userId;
    setIsLoading(false);

    // After hydration, check if challenges need refreshing
    await refreshChallengesInternal(userId, cloudChallenges ?? cachedChallenges);
  }

  /**
   * Apply a list of challenges to the appropriate state slots.
   */
  function applyChallengesState(challenges: Challenge[]) {
    const active = challenges.filter(isChallengeActive);

    const daily = active.find((c) => c.slot === 'daily') ?? null;
    const weekly = active.find((c) => c.slot === 'weekly') ?? null;
    const missions = active.filter((c) => c.slot === 'mission');

    setDailyChallenge(daily);
    setWeeklyChallenge(weekly);
    setActiveOperatorMissions(missions);
  }

  // --- refreshChallenges ---

  /**
   * Public refresh: checks slot boundaries and generates new challenges when needed.
   * Called on app open and on slot boundary transitions.
   *
   * Requirements: 1.1, 1.2
   */
  const refreshChallenges = useCallback(async () => {
    if (isGuest || !user) {
      // Guest: regenerate the preview daily challenge if expired
      if (dailyChallenge && isChallengeExpired(dailyChallenge)) {
        const result = generateDaily('guest', new Date());
        if (result.challenge) {
          const challenge = { ...result.challenge, userId: 'guest' };
          setDailyChallenge(challenge);
          writeLocalStorage(LS_GUEST_CHALLENGE_KEY, challenge);
        }
      } else if (!dailyChallenge) {
        const result = generateDaily('guest', new Date());
        if (result.challenge) {
          const challenge = { ...result.challenge, userId: 'guest' };
          setDailyChallenge(challenge);
          writeLocalStorage(LS_GUEST_CHALLENGE_KEY, challenge);
        }
      }
      return;
    }

    const allChallenges = [
      ...(dailyChallenge ? [dailyChallenge] : []),
      ...(weeklyChallenge ? [weeklyChallenge] : []),
      ...activeOperatorMissions,
    ];
    await refreshChallengesInternal(user.id, allChallenges);
  }, [user, isGuest, dailyChallenge, weeklyChallenge, activeOperatorMissions]);

  /**
   * Internal refresh logic: checks slot boundaries and generates new challenges.
   */
  async function refreshChallengesInternal(userId: string, currentChallenges: Challenge[]) {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    let needsUpdate = false;

    const activeChallenges = currentChallenges.filter(isChallengeActive);
    const currentDaily = activeChallenges.find((c) => c.slot === 'daily') ?? null;
    const currentWeekly = activeChallenges.find((c) => c.slot === 'weekly') ?? null;

    let newDaily = currentDaily;
    let newWeekly = currentWeekly;

    // Check daily slot boundary
    const lastDailyRefresh = readLocalStorage<string | null>(LS_LAST_DAILY_REFRESH_KEY, null);
    const needsNewDaily =
      !currentDaily ||
      isChallengeExpired(currentDaily) ||
      (lastDailyRefresh !== null && lastDailyRefresh !== todayStr);

    if (needsNewDaily) {
      const result = generateDaily(userId, now);
      if (result.challenge) {
        newDaily = result.challenge;
        needsUpdate = true;
        writeLocalStorage(LS_LAST_DAILY_REFRESH_KEY, todayStr);

        // Persist to Supabase via SyncQueue
        persistChallenge(result.challenge);
      }
    }

    // Check weekly slot boundary (7 days since last refresh)
    const lastWeeklyRefresh = readLocalStorage<string | null>(LS_LAST_WEEKLY_REFRESH_KEY, null);
    const needsNewWeekly = shouldRefreshWeekly(currentWeekly, lastWeeklyRefresh, now);

    if (needsNewWeekly) {
      const result = generateWeekly(userId, now);
      if (result.challenge) {
        newWeekly = result.challenge;
        needsUpdate = true;
        writeLocalStorage(LS_LAST_WEEKLY_REFRESH_KEY, todayStr);

        // Persist to Supabase via SyncQueue
        persistChallenge(result.challenge);
      }
    }

    if (needsUpdate) {
      setDailyChallenge(newDaily);
      setWeeklyChallenge(newWeekly);

      // Update local cache
      const allActive = [
        ...(newDaily ? [newDaily] : []),
        ...(newWeekly ? [newWeekly] : []),
        ...activeOperatorMissions,
      ];
      writeLocalStorage(LS_CHALLENGES_KEY, allActive);
    }
  }

  /**
   * Determine if the weekly challenge needs refreshing.
   * A weekly refreshes after 7 calendar days from the last refresh.
   */
  function shouldRefreshWeekly(
    currentWeekly: Challenge | null,
    lastWeeklyRefresh: string | null,
    now: Date
  ): boolean {
    if (!currentWeekly) return true;
    if (isChallengeExpired(currentWeekly)) return true;

    if (lastWeeklyRefresh) {
      const lastRefreshDate = new Date(lastWeeklyRefresh + 'T00:00:00');
      const daysSinceRefresh = Math.floor(
        (now.getTime() - lastRefreshDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      return daysSinceRefresh >= 7;
    }

    return false;
  }

  /**
   * Persist a challenge to Supabase via SyncQueue.
   */
  function persistChallenge(challenge: Challenge) {
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

  // --- Challenge Completion & Reward Pipeline ---
  // Implements Requirements: 5.1–5.6, 7.1–7.5, 8.1, 8.5, 9.1–9.4, 15.1

  /**
   * Award account-level XP through the existing gamification pipeline.
   * Writes to the gamification table via SyncQueue.
   * This is the single entry point for all XP awards from the mastery system.
   *
   * Requirements: 15.1
   */
  function awardXP(amount: number, source: XPSource): void {
    if (!user || isGuest) return;
    if (amount <= 0) return;

    syncQueue.enqueue({
      table: 'gamification',
      operation: 'upsert',
      payload: {
        user_id: user.id,
        xp_amount: amount,
        xp_source: source,
        awarded_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Get all operators that contributed to a challenge's progress.
   */
  function getChallengeContributors(challengeId: string): string[] {
    const contributors = challengeContributorsRef.current[challengeId];
    return contributors ? Array.from(contributors) : [];
  }

  /**
   * Handle challenge completion: the core reward pipeline.
   *
   * This function is called when a challenge's progress reaches its target_count.
   * It is idempotent: if completedAt is already set, no rewards are awarded.
   *
   * Steps:
   * 1. Check idempotency precondition (completedAt IS NULL)
   * 2. Set completed_at timestamp
   * 3. Award XP via awardXP(effectiveXpReward, 'challenge_completed')
   * 4. Award mastery_point_reward to all contributing operators
   * 5. Detect tier crossings and insert mastery_badges
   * 6. For daily challenges: increment mastery streak, detect bonus milestones
   * 7. Persist all state changes
   *
   * Requirements: 5.1–5.6, 7.1–7.5, 8.1, 8.5, 9.1–9.4, 15.1
   */
  function handleChallengeCompletion(challenge: Challenge): Challenge {
    // Idempotency anchor: only award if not already completed (Requirement 5.5)
    if (challenge.completedAt !== null) {
      return challenge;
    }

    // Guest mode: no rewards (Requirement 13.2)
    if (isGuest || !user) {
      // Still mark as completed for guest preview display
      return { ...challenge, completedAt: new Date().toISOString() };
    }

    // Step 1: Mark as completed (Requirement 5.1)
    const completedAt = new Date().toISOString();
    const completedChallenge: Challenge = { ...challenge, completedAt };

    // Step 2: Compute effective XP reward (Requirement 5.2, 16.6)
    const effectiveXpReward = computeEffectiveXpReward(challenge);

    // Step 3: Award XP (Requirement 5.2, 15.1)
    awardXP(effectiveXpReward, 'challenge_completed');

    // Step 4: Award mastery_point_reward to all contributing operators (Requirement 5.3)
    const contributors = getChallengeContributors(challenge.id);
    const masteryPointReward = challenge.masteryPointReward;

    if (contributors.length > 0 && masteryPointReward > 0) {
      for (const operatorId of contributors) {
        awardMasteryPointsToOperator(operatorId, masteryPointReward);
      }
    }

    // Step 5: For daily challenges, increment mastery streak (Requirements 9.1–9.4)
    if (challenge.slot === 'daily') {
      const today = new Date();
      const streakDelta = applyStreakIncrement(masteryStreak, today);

      // Update streak state
      setMasteryStreak(streakDelta.next);
      writeLocalStorage(LS_STREAK_KEY, streakDelta.next);

      // Persist streak via SyncQueue
      syncQueue.enqueue({
        table: 'mastery_streak',
        operation: 'upsert',
        payload: {
          user_id: user.id,
          current_streak: streakDelta.next.currentStreak,
          longest_streak: streakDelta.next.longestStreak,
          last_completed_date: streakDelta.next.lastCompletedDate,
          run_id: streakDelta.next.runId,
          bonuses_awarded_in_run: streakDelta.next.bonusesAwardedInRun,
          updated_at: new Date().toISOString(),
        },
      });

      // Award streak bonus XP if a milestone was hit (Requirement 9.3)
      if (streakDelta.bonusEarned) {
        awardXP(streakDelta.bonusEarned.xp, 'mastery_streak_bonus');
      }
    }

    // Step 6: Persist the completed challenge (Requirement 5.1)
    persistChallenge(completedChallenge);

    // Step 7: Keep slot empty until next refresh boundary (Requirement 5.6)
    // The challenge is now completed — it will be filtered out by isChallengeActive()
    // and the slot will remain empty until refreshChallenges() generates a new one.

    // Clean up contributors tracking for this challenge
    delete challengeContributorsRef.current[challenge.id];

    return completedChallenge;
  }

  /**
   * Check if a challenge has just been completed (progress reached target_count)
   * and if so, trigger the reward pipeline.
   *
   * This is the entry point called after any progress update.
   * Returns the (possibly completed) challenge.
   */
  function checkAndCompleteChallenge(challenge: Challenge): Challenge {
    if (!isCompleted(challenge)) return challenge;
    if (challenge.completedAt !== null) return challenge; // Already completed
    return handleChallengeCompletion(challenge);
  }

  // --- availableOperatorMissions ---

  /**
   * Generate up to 3 available operator missions for a specific operator.
   * These are not yet activated — they're available for the user to pick from.
   * Excludes missions that are already active for this operator.
   * Caches generated missions so they can be activated by id.
   *
   * Requirements: 6.1
   */
  const availableOperatorMissions = useCallback(
    (operatorId: string): Challenge[] => {
      if (isGuest || !user) return [];

      // Count how many active missions already exist for this operator
      const activeForOperator = activeOperatorMissions.filter(
        (m) =>
          m.operatorPool.length === 1 &&
          m.operatorPool[0] === operatorId
      );

      // Generate up to 3 available missions (these are candidates, not yet active)
      const results = generateOperatorMissions(user.id, operatorId);
      const available = results
        .filter((r) => r.challenge !== null)
        .map((r) => r.challenge!);

      // Filter out any that are duplicates of already-active ones
      const filtered = available.filter(
        (mission) => !activeForOperator.some((active) => active.id === mission.id)
      );

      // Cache generated missions so activateOperatorMission can find them by id
      for (const mission of filtered) {
        generatedMissionsRef.current.set(mission.id, mission);
      }

      return filtered;
    },
    [user, isGuest, activeOperatorMissions]
  );

  // --- Lifecycle Hooks (task 5.2 + 5.3 completion pipeline) ---

  /**
   * Get all currently active challenges as an array.
   */
  function getAllActiveChallenges(): Challenge[] {
    const challenges: Challenge[] = [];
    if (dailyChallenge && isChallengeActive(dailyChallenge)) challenges.push(dailyChallenge);
    if (weeklyChallenge && isChallengeActive(weeklyChallenge)) challenges.push(weeklyChallenge);
    for (const mission of activeOperatorMissions) {
      if (isChallengeActive(mission)) challenges.push(mission);
    }
    return challenges;
  }

  /**
   * Update a challenge in the appropriate state slot and persist it.
   * If the challenge's progress has reached target_count, triggers the
   * completion reward pipeline (task 5.3).
   */
  function updateChallengeInState(updated: Challenge) {
    // Check for completion and trigger reward pipeline if needed (task 5.3)
    const finalChallenge = checkAndCompleteChallenge(updated);

    if (finalChallenge.completedAt) {
      // Challenge is completed — remove from active state
      if (finalChallenge.slot === 'daily') {
        setDailyChallenge(null);
      } else if (finalChallenge.slot === 'weekly') {
        setWeeklyChallenge(null);
      } else if (finalChallenge.slot === 'mission') {
        setActiveOperatorMissions((prev) =>
          prev.filter((m) => m.id !== finalChallenge.id)
        );
      }
    } else {
      // Challenge still active — update progress in state
      if (finalChallenge.slot === 'daily') {
        setDailyChallenge(finalChallenge);
      } else if (finalChallenge.slot === 'weekly') {
        setWeeklyChallenge(finalChallenge);
      } else if (finalChallenge.slot === 'mission') {
        setActiveOperatorMissions((prev) =>
          prev.map((m) => (m.id === finalChallenge.id ? finalChallenge : m))
        );
      }
    }

    // Persist via SyncQueue (handleChallengeCompletion already persists on completion,
    // but we persist here for progress-only updates)
    if (!isGuest && user && !finalChallenge.completedAt) {
      persistChallenge(finalChallenge);
    }

    // Update local cache
    updateLocalChallengeCache(finalChallenge);
  }

  /**
   * Update the localStorage challenge cache with an updated challenge.
   */
  function updateLocalChallengeCache(updated: Challenge) {
    const cached = readLocalStorage<Challenge[]>(LS_CHALLENGES_KEY, []);
    if (updated.completedAt) {
      // Remove completed challenges from the active cache
      const filtered = cached.filter((c) => c.id !== updated.id);
      writeLocalStorage(LS_CHALLENGES_KEY, filtered);
    } else {
      const idx = cached.findIndex((c) => c.id === updated.id);
      if (idx >= 0) {
        cached[idx] = updated;
      } else {
        cached.push(updated);
      }
      writeLocalStorage(LS_CHALLENGES_KEY, cached);
    }
  }

  /**
   * Track that an operator contributed to a challenge's progress.
   */
  function trackContributor(challengeId: string, operatorId: string) {
    if (!challengeContributorsRef.current[challengeId]) {
      challengeContributorsRef.current[challengeId] = new Set();
    }
    challengeContributorsRef.current[challengeId].add(operatorId);
  }

  /**
   * Award mastery points to an operator and handle tier crossing / badge unlock.
   * Returns the updated mastery state.
   *
   * Requirements: 7.1–7.5, 8.1, 8.5
   */
  function awardMasteryPointsToOperator(operatorId: string, points: number): Record<string, OperatorMastery> {
    let currentMastery = { ...operatorMastery };

    // Initialize operator mastery if not present
    if (!currentMastery[operatorId]) {
      currentMastery[operatorId] = {
        userId: user?.id ?? '',
        operatorId,
        masteryPoints: 0,
        currentTier: 'Bronze' as MasteryTier,
      };
    }

    const { next, tierCrossed } = applyAward(currentMastery[operatorId], points);
    currentMastery = { ...currentMastery, [operatorId]: next };

    // Persist mastery update
    if (!isGuest && user) {
      syncQueue.enqueue({
        table: 'operator_mastery',
        operation: 'upsert',
        payload: {
          user_id: user.id,
          operator_id: operatorId,
          mastery_points: next.masteryPoints,
          current_tier: next.currentTier,
          updated_at: new Date().toISOString(),
        },
      });
    }

    // Handle tier crossing — unlock badge
    if (tierCrossed && !isGuest && user) {
      const badgeId = generateBadgeId();
      const newBadge: MasteryBadge = {
        id: badgeId,
        userId: user.id,
        operatorId,
        tier: tierCrossed,
        unlockedAt: new Date().toISOString(),
      };

      // Check if badge already exists (idempotency via UNIQUE constraint)
      const alreadyExists = masteryBadges.some(
        (b) => b.operatorId === operatorId && b.tier === tierCrossed
      );

      if (!alreadyExists) {
        setMasteryBadges((prev) => [...prev, newBadge]);
        writeLocalStorage(LS_BADGES_KEY, [...masteryBadges, newBadge]);

        // Persist badge — UNIQUE constraint handles duplicates
        syncQueue.enqueue({
          table: 'mastery_badges',
          operation: 'insert',
          payload: {
            id: badgeId,
            user_id: user.id,
            operator_id: operatorId,
            tier: tierCrossed,
            unlocked_at: newBadge.unlockedAt,
          },
        });
      }
    }

    setOperatorMastery(currentMastery);
    writeLocalStorage(LS_OPERATOR_MASTERY_KEY, currentMastery);

    return currentMastery;
  }

  /**
   * Generate a unique badge ID.
   */
  function generateBadgeId(): string {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch {
      // fall through
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Look up a deployment by ID from the deployment history.
   */
  function findDeployment(deploymentId: string): DeploymentRecord | undefined {
    return deploymentHistory.find((d) => d.id === deploymentId);
  }

  /**
   * Called when a deployment is accepted by the Operator_Roller.
   * Evaluates eligibility for all active challenges and applies progress
   * for `complete_deployments` objective.
   *
   * Requirements: 3.1–3.8, 4.1, 4.5
   */
  const onDeploymentAccepted = useCallback(
    async (deployment: DeploymentRecord): Promise<void> => {
      // Guest mode: track progress locally but no mastery/XP awards
      if (isGuest || !user) {
        if (dailyChallenge && isChallengeActive(dailyChallenge)) {
          const updated = applyDeploymentProgress(deployment, dailyChallenge);
          if (updated.progress !== dailyChallenge.progress) {
            setDailyChallenge(updated);
            writeLocalStorage(LS_GUEST_CHALLENGE_KEY, updated);
          }
        }
        return;
      }

      const activeChallenges = getAllActiveChallenges();

      for (const challenge of activeChallenges) {
        // Only process complete_deployments objective on deployment acceptance
        if (challenge.objective !== 'complete_deployments') continue;

        const eligibility = evaluateEligibility(deployment, challenge);
        if (!eligibility.fullyEligible) continue;

        const updated = applyDeploymentProgress(deployment, challenge);
        if (updated.progress !== challenge.progress) {
          // Track this operator as a contributor
          trackContributor(challenge.id, deployment.operatorId);
          updateChallengeInState(updated);
        }
      }
    },
    [user, isGuest, dailyChallenge, weeklyChallenge, activeOperatorMissions, operatorMastery, masteryBadges]
  );

  /**
   * Called when a kill is incremented (or reverted) for an operator on a deployment.
   * Applies kill progress to eligible challenges with `get_kills` objective.
   * Handles revert (delta -1) for kill-revert scenarios.
   *
   * Requirements: 4.4, 4.5, 4.6, 7.3
   */
  const onKillIncremented = useCallback(
    async (deploymentId: string, operatorId: string, delta: 1 | -1): Promise<void> => {
      // Guest mode: no kill tracking for mastery
      if (isGuest || !user) return;

      const deployment = findDeployment(deploymentId);
      if (!deployment) return;

      const activeChallenges = getAllActiveChallenges();

      for (const challenge of activeChallenges) {
        if (challenge.objective !== 'get_kills') continue;

        const eligibility = evaluateEligibility(deployment, challenge);
        if (!eligibility.fullyEligible) continue;

        const updated = applyKillIncrement(deployment, challenge, delta);
        if (updated.progress !== challenge.progress) {
          if (delta === 1) {
            trackContributor(challenge.id, operatorId);
          }
          updateChallengeInState(updated);
        }
      }
    },
    [user, isGuest, dailyChallenge, weeklyChallenge, activeOperatorMissions, deploymentHistory]
  );

  /**
   * Report a match result for a deployment.
   * Persists the result, evaluates progress for win/survive objectives,
   * awards mastery points, and handles the 10-minute mutability window with revert logic.
   *
   * Requirements: 11.1–11.5, 3.1–3.8, 4.2, 4.3, 7.1, 7.2
   */
  const reportMatchResult = useCallback(
    async (deploymentId: string, result: MatchResult): Promise<MatchResultReportOutcome> => {
      // Guest mode: no match result tracking
      if (isGuest || !user) {
        return { applied: false, reason: 'persistence_failure' };
      }

      const deployment = findDeployment(deploymentId);
      if (!deployment) {
        return { applied: false, reason: 'persistence_failure' };
      }

      const now = new Date();
      const existingResult = matchResultsRef.current[deploymentId];

      // Check if this is a change to an existing result
      if (existingResult) {
        // Check if the result is the same — no-op
        if (existingResult.result === result) {
          return { applied: false, reason: 'no_change' };
        }

        // Check the 10-minute mutability window
        const reportedAt = new Date(existingResult.reportedAt).getTime();
        const elapsed = now.getTime() - reportedAt;
        if (elapsed > MATCH_RESULT_MUTABILITY_WINDOW_MS) {
          return { applied: false, reason: 'outside_mutability_window' };
        }

        // --- Revert previous result ---
        // Revert challenge progress from the previous result
        revertMatchResultProgress(deployment, existingResult.result);

        // Revert mastery points from the previous result
        // Note: Per design, within the mutability window, the revert is part of the same
        // logical event. We track the "net" effect by reverting and re-applying.
        // Mastery points are monotonic across the account lifecycle, but within the
        // mutability window we handle this by not awarding points for 'loss' results
        // and only awarding for win/survived_round.
        revertMasteryPoints(deployment, existingResult.result);
      }

      // --- Apply new result ---

      // Persist match result
      const matchResultRow: MatchResultRow = {
        deploymentId,
        userId: user.id,
        result,
        reportedAt: existingResult?.reportedAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
      };
      matchResultsRef.current[deploymentId] = matchResultRow;

      // Persist to match_results table
      syncQueue.enqueue({
        table: 'match_results',
        operation: 'upsert',
        payload: {
          deployment_id: deploymentId,
          user_id: user.id,
          result,
          reported_at: matchResultRow.reportedAt,
          updated_at: matchResultRow.updatedAt,
        },
      });

      // Also update the denormalized column on deployments table
      syncQueue.enqueue({
        table: 'deployments',
        operation: 'upsert',
        payload: {
          id: deploymentId,
          match_result: result,
          updated_at: now.toISOString(),
        },
      });

      // Persist match results to localStorage for quick access
      writeLocalStorage(LS_MATCH_RESULTS_KEY, matchResultsRef.current);

      // Apply challenge progress for win/survive objectives
      const activeChallenges = getAllActiveChallenges();
      for (const challenge of activeChallenges) {
        const objectiveMatches =
          (challenge.objective === 'win_rounds' && result === 'win') ||
          (challenge.objective === 'survive_rounds' && result === 'survived_round');

        if (!objectiveMatches) continue;

        const eligibility = evaluateEligibility(deployment, challenge);
        if (!eligibility.fullyEligible) continue;

        const updated = applyMatchResultProgress(deployment, result, challenge);
        if (updated.progress !== challenge.progress) {
          trackContributor(challenge.id, deployment.operatorId);
          updateChallengeInState(updated);
        }
      }

      // Award mastery points based on match result (Req 7.1, 7.2)
      if (result === 'win') {
        const points = pointsFor({ kind: 'match_result_win' });
        awardMasteryPointsToOperator(deployment.operatorId, points);
      } else if (result === 'survived_round') {
        const points = pointsFor({ kind: 'match_result_survived' });
        awardMasteryPointsToOperator(deployment.operatorId, points);
      }
      // 'loss' does not award mastery points

      return { applied: true };
    },
    [user, isGuest, dailyChallenge, weeklyChallenge, activeOperatorMissions, operatorMastery, masteryBadges, deploymentHistory]
  );

  /**
   * Revert challenge progress that was applied from a previous match result.
   * Used when a match result is changed within the 10-minute mutability window.
   *
   * Requirements: 11.5
   */
  function revertMatchResultProgress(deployment: DeploymentRecord, previousResult: MatchResult) {
    const activeChallenges = getAllActiveChallenges();

    for (const challenge of activeChallenges) {
      const objectiveMatches =
        (challenge.objective === 'win_rounds' && previousResult === 'win') ||
        (challenge.objective === 'survive_rounds' && previousResult === 'survived_round');

      if (!objectiveMatches) continue;

      const eligibility = evaluateEligibility(deployment, challenge);
      if (!eligibility.fullyEligible) continue;

      // Decrement progress by 1, clamped to 0
      const revertedProgress = Math.max(0, challenge.progress - 1);
      if (revertedProgress !== challenge.progress) {
        const reverted = { ...challenge, progress: revertedProgress };
        updateChallengeInState(reverted);
      }
    }
  }

  /**
   * Revert mastery points that were awarded from a previous match result.
   * Within the mutability window, we track the net effect by subtracting
   * the previously awarded points. Since mastery points are monotonic across
   * the account lifecycle, this revert is only valid within the same logical event.
   *
   * Requirements: 11.5
   */
  function revertMasteryPoints(deployment: DeploymentRecord, previousResult: MatchResult) {
    if (previousResult === 'loss') return; // loss doesn't award points, nothing to revert

    const pointsToRevert =
      previousResult === 'win'
        ? pointsFor({ kind: 'match_result_win' })
        : pointsFor({ kind: 'match_result_survived' });

    const currentState = operatorMastery[deployment.operatorId];
    if (!currentState) return;

    // Subtract points (clamped to 0) — this is only valid within the mutability window
    const newPoints = Math.max(0, currentState.masteryPoints - pointsToRevert);
    const updatedState: OperatorMastery = {
      ...currentState,
      masteryPoints: newPoints,
      currentTier: computeTierFromPoints(newPoints),
    };

    const updatedMastery = { ...operatorMastery, [deployment.operatorId]: updatedState };
    setOperatorMastery(updatedMastery);
    writeLocalStorage(LS_OPERATOR_MASTERY_KEY, updatedMastery);

    // Persist the reverted mastery state
    if (!isGuest && user) {
      syncQueue.enqueue({
        table: 'operator_mastery',
        operation: 'upsert',
        payload: {
          user_id: user.id,
          operator_id: deployment.operatorId,
          mastery_points: newPoints,
          current_tier: updatedState.currentTier,
          updated_at: new Date().toISOString(),
        },
      });
    }
  }

  // --- User Actions ---

  /**
   * Activate an operator mission by moving it into the active challenge set.
   * Enforces max 3 active operator missions.
   *
   * Requirements: 6.2, 6.3, 6.4
   */
  const activateOperatorMission = useCallback(
    async (challengeId: string): Promise<ActivateResult> => {
      // Check if already at the mission limit
      const currentActiveMissions = activeOperatorMissions.filter(isChallengeActive);
      if (currentActiveMissions.length >= 3) {
        return { activated: false, reason: 'mission_limit_reached' };
      }

      // Check if this mission is already active
      if (currentActiveMissions.some((m) => m.id === challengeId)) {
        return { activated: false, reason: 'already_active' };
      }

      // First, check if the challenge already exists in Supabase (e.g., previously discarded mission being re-activated)
      if (user) {
        try {
          const { data } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .eq('user_id', user.id)
            .single();

          if (data) {
            const challenge = mapChallengeRow(data);
            if (challenge.slot !== 'mission') {
              return { activated: false, reason: 'already_active' };
            }

            // Re-activate: clear discardedAt and persist
            const reactivated: Challenge = { ...challenge, discardedAt: null };
            persistChallenge(reactivated);

            // Add to active missions state
            const updatedMissions = [...currentActiveMissions, reactivated];
            setActiveOperatorMissions(updatedMissions);

            // Update local cache
            const allActive = [
              ...(dailyChallenge ? [dailyChallenge] : []),
              ...(weeklyChallenge ? [weeklyChallenge] : []),
              ...updatedMissions,
            ];
            writeLocalStorage(LS_CHALLENGES_KEY, allActive);

            return { activated: true };
          }
        } catch {
          // Not found in DB — check the generated missions cache below
        }
      }

      // Look up in the generated missions ref cache (freshly generated by availableOperatorMissions)
      const cachedMission = generatedMissionsRef.current.get(challengeId);
      if (cachedMission) {
        // Persist the mission to Supabase via SyncQueue
        persistChallenge(cachedMission);

        // Add to active missions state
        const updatedMissions = [...currentActiveMissions, cachedMission];
        setActiveOperatorMissions(updatedMissions);

        // Update local cache
        const allActive = [
          ...(dailyChallenge ? [dailyChallenge] : []),
          ...(weeklyChallenge ? [weeklyChallenge] : []),
          ...updatedMissions,
        ];
        writeLocalStorage(LS_CHALLENGES_KEY, allActive);

        // Remove from generated cache
        generatedMissionsRef.current.delete(challengeId);

        return { activated: true };
      }

      // Challenge not found in DB or cache — cannot activate
      return { activated: false, reason: 'already_active' };
    },
    [user, activeOperatorMissions, dailyChallenge, weeklyChallenge]
  );

  /**
   * Discard an active challenge. Sets discardedAt and removes from active set.
   * No rewards are awarded for discarded challenges.
   * Operator missions can be re-activated later after discard.
   *
   * Requirements: 6.5, 2.4
   */
  const discardChallenge = useCallback(
    async (challengeId: string): Promise<void> => {
      const now = new Date().toISOString();

      // Find the challenge in active state
      let found: Challenge | null = null;

      if (dailyChallenge?.id === challengeId) {
        found = dailyChallenge;
        setDailyChallenge(null);
      } else if (weeklyChallenge?.id === challengeId) {
        found = weeklyChallenge;
        setWeeklyChallenge(null);
      } else {
        const missionIndex = activeOperatorMissions.findIndex((m) => m.id === challengeId);
        if (missionIndex !== -1) {
          found = activeOperatorMissions[missionIndex];
          const updatedMissions = activeOperatorMissions.filter((m) => m.id !== challengeId);
          setActiveOperatorMissions(updatedMissions);
        }
      }

      if (!found) return;

      // Mark as discarded
      const discardedChallenge: Challenge = {
        ...found,
        discardedAt: now,
      };

      // Persist the discard via SyncQueue
      persistChallenge(discardedChallenge);

      // Update local cache
      const allActive = [
        ...(dailyChallenge && dailyChallenge.id !== challengeId ? [dailyChallenge] : []),
        ...(weeklyChallenge && weeklyChallenge.id !== challengeId ? [weeklyChallenge] : []),
        ...activeOperatorMissions.filter((m) => m.id !== challengeId),
      ];
      writeLocalStorage(LS_CHALLENGES_KEY, allActive);
    },
    [dailyChallenge, weeklyChallenge, activeOperatorMissions]
  );

  // --- Context Value ---

  const value: MasteryContextValue = {
    dailyChallenge,
    weeklyChallenge,
    activeOperatorMissions,
    availableOperatorMissions,
    operatorMastery,
    masteryBadges,
    masteryStreak,
    onDeploymentAccepted,
    onKillIncremented,
    reportMatchResult,
    activateOperatorMission,
    discardChallenge,
    refreshChallenges,
    isLoading,
  };

  return (
    <MasteryContext.Provider value={value}>
      {children}
    </MasteryContext.Provider>
  );
}

/**
 * Hook to access the MasteryContext.
 * Must be used within a MasteryProvider.
 */
export function useMastery(): MasteryContextValue {
  const context = useContext(MasteryContext);
  if (context === undefined) {
    throw new Error('useMastery must be used within a MasteryProvider');
  }
  return context;
}
