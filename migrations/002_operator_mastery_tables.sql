-- ============================================================================
-- XAWARS RNG — Operator Mastery MVP Schema
-- ============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Prerequisites:
--   1. Migration 001_initial_schema.sql has been applied
--   2. The `profiles` and `deployments` tables exist
--
-- This migration creates five new tables for the Operator Mastery system:
--   - challenges
--   - operator_mastery
--   - mastery_badges
--   - mastery_streak
--   - match_results
--
-- It also adds a nullable `match_result` column to the existing `deployments`
-- table as a denormalized convenience column.
-- ============================================================================


-- ============================================================================
-- TABLE: challenges
-- ============================================================================
-- Stores daily, weekly, and operator mission challenges for each user.
-- Challenges track progress toward objectives and award XP + mastery points
-- on completion.

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('daily', 'weekly', 'mission')),
  role TEXT,
  objective TEXT NOT NULL CHECK (objective IN (
    'complete_deployments', 'win_rounds', 'survive_rounds', 'get_kills'
  )),
  target_count INTEGER NOT NULL CHECK (target_count BETWEEN 1 AND 50),
  restriction_kind TEXT CHECK (restriction_kind IN (
    'gadget_only', 'playstyle', 'loadout_limit'
  )),
  restriction_value TEXT,
  operator_scope TEXT NOT NULL CHECK (operator_scope IN (
    'any', 'random_pool', 'specific_operator'
  )),
  operator_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
  mastery_point_reward INTEGER NOT NULL CHECK (mastery_point_reward >= 0),
  xp_override INTEGER CHECK (xp_override IS NULL OR (xp_override BETWEEN 0 AND 10000)),
  xp_override_reason TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Both override fields together, or both null
  CHECK (
    (xp_override IS NULL AND xp_override_reason IS NULL)
    OR (xp_override IS NOT NULL AND xp_override_reason IS NOT NULL)
  ),
  -- progress can never exceed target
  CHECK (progress <= target_count)
);

CREATE INDEX idx_challenges_user_active
  ON public.challenges (user_id, slot)
  WHERE completed_at IS NULL AND discarded_at IS NULL;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_owner" ON public.challenges
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- TABLE: operator_mastery
-- ============================================================================
-- Tracks per-operator mastery points and current tier for each user.
-- One row per user + operator combination.

CREATE TABLE public.operator_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL,
  mastery_points INTEGER NOT NULL DEFAULT 0 CHECK (mastery_points >= 0),
  current_tier TEXT NOT NULL DEFAULT 'Bronze'
    CHECK (current_tier IN ('Bronze','Silver','Gold','Platinum','Diamond')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, operator_id)
);

ALTER TABLE public.operator_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_mastery_owner" ON public.operator_mastery
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.operator_mastery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- TABLE: mastery_badges
-- ============================================================================
-- Records tier badges unlocked per operator. One badge per (user, operator, tier).
-- The UNIQUE constraint enforces idempotent badge unlocks across sync replays.

CREATE TABLE public.mastery_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Bronze','Silver','Gold','Platinum','Diamond')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, operator_id, tier)
);

ALTER TABLE public.mastery_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mastery_badges_owner" ON public.mastery_badges
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- TABLE: mastery_streak
-- ============================================================================
-- Tracks the daily-challenge-specific mastery streak for each user.
-- One row per user. run_id changes on every streak reset; bonuses_awarded_in_run
-- makes milestone bonus awards idempotent across sync replays.

CREATE TABLE public.mastery_streak (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_completed_date DATE,
  run_id UUID NOT NULL DEFAULT gen_random_uuid(),
  bonuses_awarded_in_run JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mastery_streak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mastery_streak_owner" ON public.mastery_streak
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mastery_streak
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- TABLE: match_results
-- ============================================================================
-- Records the match outcome for a deployment. One result per deployment.
-- The 10-minute mutability window is enforced at the application layer using
-- reported_at. updated_at is used for sync conflict resolution (latest wins).

CREATE TABLE public.match_results (
  deployment_id UUID PRIMARY KEY REFERENCES public.deployments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('win','loss','survived_round')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_results_owner" ON public.match_results
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- ALTER TABLE: deployments — add match_result column
-- ============================================================================
-- Denormalized convenience column so the deployment list can render the result
-- chip without joining match_results. Source of truth is match_results.

ALTER TABLE public.deployments
  ADD COLUMN match_result TEXT
  CHECK (match_result IS NULL OR match_result IN ('win','loss','survived_round'));
