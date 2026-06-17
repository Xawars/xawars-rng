import type { Loadout, MatchType, Platform } from '../data/types';

/**
 * A record of a single operator deployment from the roulette.
 * Maps to the `public.deployments` Supabase table.
 */
export interface DeploymentRecord {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorSide: 'attacker' | 'defender';
  loadout: Loadout;
  matchType?: MatchType;
  platform?: Platform;
  targetKills: number;
  role?: string;
  deployedAt: string;
}

/**
 * Per-operator kill/death/deployment stats.
 * Maps to the `public.operator_stats` Supabase table.
 */
export interface OperatorStatRecord {
  operatorId: string;
  operatorName: string;
  operatorSide: 'attacker' | 'defender';
  kills: number;
  deaths: number;
  deployments: number;
}

/**
 * User gamification state: XP, streaks.
 * Maps to the `public.gamification` Supabase table.
 */
export interface GamificationRecord {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * A single unlocked achievement for a user.
 * Maps to the `public.achievements` Supabase table.
 */
export interface AchievementRecord {
  achievementId: string;
  unlockedAt: string;
}

/**
 * Per-operator per-map performance record.
 * Single source of truth for all map-related performance metrics.
 * Maps to the `public.map_performance` Supabase table.
 */
export interface MapPerformanceRecord {
  operatorId: string;
  mapId: string;
  kills: number;
  deaths: number;
  rounds: number;
  roundsWon: number;
  roundsLost: number;
  matches: number;
  matchesWon: number;
  matchesLost: number;
}

/**
 * Per-operator per-map per-site performance record.
 * Stored locally under `xawars_sitePerformance`.
 */
export interface SitePerformanceRecord {
  operatorId: string;
  mapId: string;
  siteId: string;
  kills: number;
  deaths: number;
  matches: number;
}

/**
 * Computed display stats for a single operator-map combination.
 * Only computed when the record meets the insight threshold (≥3 matches).
 */
export interface MapDisplayStats {
  mapId: string;
  mapName: string;
  kills: number;
  deaths: number;
  matches: number;
  kd: number;       // kills / deaths, to 2 decimal places
  avgKills: number;  // kills / matches
}

/**
 * A single entry in the map breakdown panel for an operator.
 * Includes threshold gating and best-map highlighting.
 */
export interface MapBreakdownEntry {
  mapId: string;
  mapName: string;
  kills: number;
  deaths: number;
  matches: number;
  kd: number | null;        // null if below threshold
  avgKills: number | null;  // null if below threshold
  meetsThreshold: boolean;
  isBest: boolean;          // true for highest K/D entry
}

/**
 * A top-performing operator entry for a given map.
 * Used in the Map Advisor's Best Operators section.
 */
export interface BestOperatorEntry {
  operatorId: string;
  operatorName: string;
  kd: number;
  matches: number;
}

/**
 * Per-map win/loss record.
 * Maps to the `public.map_win_loss` Supabase table.
 */
export interface MapWinLossRecord {
  mapId: string;
  wins: number;
  losses: number;
}

/**
 * In-memory streak state for tracking consecutive kills.
 * Not persisted — resets on page load.
 */
export interface StreakState {
  count: number;        // 0..N consecutive kills
  isHotStreak: boolean; // count >= 3
}

/**
 * In-memory session snapshot captured at hydration.
 * Used to compute session deltas.
 */
export interface SessionSnapshot {
  totalKills: number;
  totalDeaths: number;
  operatorStats: Record<string, { kills: number; deaths: number }>;
  mapWinLoss: Record<string, { wins: number; losses: number }>;
}

/**
 * Computed session delta data for display in the session summary modal.
 */
export interface SessionDeltaData {
  kills: number;
  deaths: number;
  kdRatio: number | null; // null when deaths = 0 and kills = 0
  isPerfect: boolean;     // true when kills > 0 and deaths = 0
  isEmpty: boolean;       // true when kills = 0 and deaths = 0
  operators: SessionOperatorDelta[];
  bestMap: SessionBestMap | null;
  mapWinLossSummary: SessionMapWinLossSummary | null;
}

/**
 * Summary of map wins and losses recorded during a session.
 * Null when no wins or losses were recorded.
 */
export interface SessionMapWinLossSummary {
  wins: number;
  losses: number;
}

/**
 * Per-operator delta within a session.
 */
export interface SessionOperatorDelta {
  operatorId: string;
  operatorName: string;
  kills: number;
  deaths: number;
}

/**
 * Best-performing map during a session.
 */
export interface SessionBestMap {
  mapId: string;
  mapName: string;
  kd: number;
}

export type { Loadout, MatchType, Platform };
