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

export type { Loadout, MatchType, Platform };
