-- ============================================================================
-- XAWARS RNG — Map Performance Table
-- ============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Prerequisites:
--   1. Migration 001_initial_schema.sql must be applied (creates update_updated_at())
--
-- This migration creates the `map_performance` table for tracking per-operator,
-- per-map kill/death/match statistics. It uses additive upsert semantics so that
-- kills, deaths, and matches are always summed into existing totals rather than
-- overwritten.
-- ============================================================================


-- ============================================================================
-- TABLE: map_performance
-- ============================================================================
-- Tracks per-operator, per-map performance stats: kills, deaths, match count.
-- One row per user + operator + map combination.
-- Uses additive upsert: deltas are summed into existing totals on conflict.

create table public.map_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operator_id text not null,
  map_id text not null,
  kills integer not null default 0,
  deaths integer not null default 0,
  matches integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, operator_id, map_id)
);

alter table public.map_performance enable row level security;

create policy "Users can manage own map performance"
  on public.map_performance for all
  using (auth.uid() = user_id);

create index idx_map_performance_user_id on public.map_performance(user_id);

create trigger set_updated_at
  before update on public.map_performance
  for each row execute function public.update_updated_at();


-- ============================================================================
-- UPSERT PATTERN (for application reference)
-- ============================================================================
-- Use this pattern when recording map performance deltas. The ON CONFLICT
-- clause ensures additive semantics — kills, deaths, and matches are always
-- incremented, never overwritten.
--
-- INSERT INTO public.map_performance (user_id, operator_id, map_id, kills, deaths, matches, updated_at)
-- VALUES ($1, $2, $3, $4, $5, $6, now())
-- ON CONFLICT (user_id, operator_id, map_id)
-- DO UPDATE SET
--   kills = map_performance.kills + EXCLUDED.kills,
--   deaths = map_performance.deaths + EXCLUDED.deaths,
--   matches = map_performance.matches + EXCLUDED.matches,
--   updated_at = now();
-- ============================================================================
