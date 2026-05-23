// app/types/mastery.ts
// Types for the Operator Mastery MVP module.

// --- Scalar / Union Types ---

export type ChallengeSlot = 'daily' | 'weekly' | 'mission';

export type Objective =
  | 'complete_deployments'
  | 'win_rounds'
  | 'survive_rounds'
  | 'get_kills';

export type RestrictionKind = 'gadget_only' | 'playstyle' | 'loadout_limit';

export type OperatorScope = 'any' | 'random_pool' | 'specific_operator';

export type MasteryTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export type MatchResult = 'win' | 'loss' | 'survived_round';

// --- Interfaces ---

export interface Restriction {
  kind: RestrictionKind;
  value: string; // gadget name | role string | weapon name
}

export interface Challenge {
  id: string;
  userId: string;
  slot: ChallengeSlot;
  role: string | null;
  objective: Objective;
  targetCount: number; // 1..50
  restriction: Restriction | null;
  operatorScope: OperatorScope;
  operatorPool: string[]; // [] for 'any', 1..5 for 'random_pool', length 1 for 'specific_operator'
  xpReward: number; // canonical or override
  masteryPointReward: number;
  xpOverride: number | null;
  xpOverrideReason: string | null;
  progress: number; // 0..targetCount
  generatedAt: string;
  expiresAt: string | null; // null for mission
  completedAt: string | null;
  discardedAt: string | null;
}

export interface OperatorMastery {
  userId: string;
  operatorId: string;
  masteryPoints: number;
  currentTier: MasteryTier;
}

export interface MasteryBadge {
  id: string;
  userId: string;
  operatorId: string;
  tier: MasteryTier;
  unlockedAt: string;
}

export interface MasteryStreakState {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  runId: string;
  bonusesAwardedInRun: Array<3 | 7 | 30>;
}

export interface MatchResultRow {
  deploymentId: string;
  userId: string;
  result: MatchResult;
  reportedAt: string;
  updatedAt: string;
}

// --- Engine Result Types ---

export interface Eligibility {
  operatorScopeOk: boolean;
  roleOk: boolean;
  restrictionOk: boolean;
  fullyEligible: boolean; // operatorScopeOk && roleOk && restrictionOk
}

export interface MatchResultReportOutcome {
  applied: boolean;
  reason?: 'outside_mutability_window' | 'no_change' | 'persistence_failure';
}

export interface ActivateResult {
  activated: boolean;
  reason?: 'mission_limit_reached' | 'already_active';
}

export type MasteryEvent =
  | { kind: 'match_result_win' }
  | { kind: 'match_result_survived' }
  | { kind: 'kill_target_complete' }
  | { kind: 'challenge_completed'; reward: number };

export interface StreakDelta {
  next: MasteryStreakState;
  bonusEarned: { length: 3 | 7 | 30; xp: 50 | 150 | 750 } | null;
}

// --- XPSource Extension ---
// Extends the existing XPSource concept with mastery-specific sources.
// The existing values are: 'deployment', 'kill_target', 'content_idea', 'ranked_win'.
// This type adds the two new mastery sources.

export type XPSource =
  | 'deployment'
  | 'kill_target'
  | 'content_idea'
  | 'ranked_win'
  | 'challenge_completed'
  | 'mastery_streak_bonus';
