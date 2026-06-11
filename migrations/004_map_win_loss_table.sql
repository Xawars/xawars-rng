-- ============================================================================
-- XAWARS RNG — Map Win/Loss Table
-- ============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Prerequisites:
--   1. Migration 001_initial_schema.sql must be applied (creates update_updated_at())
--
-- This migration creates the `map_win_loss` table for tracking per-map win/loss
-- outcomes (independent of operator). It uses additive upsert semantics so that
-- wins and losses are always summed into existing totals rather than overwritten.
-- ============================================================================


-- ============================================================================
-- TABLE: map_win_loss
-- ============================================================================
-- Tracks per-map win/loss outcomes: wins and losses count.
-- One row per user + map combination.
-- Uses additive upsert: deltas are summed into existing totals on conflict.

create table public.map_win_loss (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  map_id text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, map_id)
);

alter table public.map_win_loss enable row level security;

create policy "Users can manage own map win/loss"
  on public.map_win_loss for all
  using (auth.uid() = user_id);

create index idx_map_win_loss_user_id on public.map_win_loss(user_id);

create trigger set_updated_at
  before update on public.map_win_loss
  for each row execute function public.update_updated_at();


-- ============================================================================
-- UPSERT PATTERN (for application reference)
-- ============================================================================
-- Use this pattern when recording map win/loss outcomes. The ON CONFLICT
-- clause ensures additive semantics — wins and losses are always incremented,
-- never overwritten.
--
-- INSERT INTO public.map_win_loss (user_id, map_id, wins, losses, updated_at)
-- VALUES ($1, $2, $3, $4, now())
-- ON CONFLICT (user_id, map_id)
-- DO UPDATE SET
--   wins = map_win_loss.wins + EXCLUDED.wins,
--   losses = map_win_loss.losses + EXCLUDED.losses,
--   updated_at = now();
-- ============================================================================
