-- ============================================================================
-- XAWARS RNG — Initial Database Schema
-- ============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Prerequisites:
--   1. Enable Email provider in Authentication → Providers
--   2. Enable Google OAuth provider (optional)
--   3. Enable Discord OAuth provider (optional)
--
-- Supabase automatically manages the `auth` schema (auth.users, auth.sessions,
-- auth.refresh_tokens, etc.). This migration creates the PUBLIC tables that
-- the application uses to store user-specific data.
-- ============================================================================


-- ============================================================================
-- UTILITY: updated_at trigger function
-- ============================================================================
-- Automatically sets `updated_at = now()` on every UPDATE.
-- Applied to all tables that have an `updated_at` column.

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Extends auth.users with application-specific user data.
-- A row is auto-created via trigger whenever a new user signs up.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();


-- ============================================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================================
-- Fires after a new row is inserted into auth.users (email or OAuth signup).
-- Pulls display_name and avatar_url from the provider's user_metadata.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- TABLE: deployments
-- ============================================================================
-- Records each operator deployment from the roulette wheel.
-- Used for history display and stat aggregation.

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operator_id text not null,
  operator_name text not null,
  operator_side text not null check (operator_side in ('attacker', 'defender')),
  loadout jsonb not null default '{}',
  match_type text,
  platform text,
  target_kills int not null default 0,
  role text,
  deployed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deployments enable row level security;

create policy "Users can manage own deployments"
  on public.deployments for all
  using (auth.uid() = user_id);

create index idx_deployments_user_id on public.deployments(user_id);
create index idx_deployments_deployed_at on public.deployments(user_id, deployed_at desc);

create trigger set_updated_at
  before update on public.deployments
  for each row execute function public.update_updated_at();


-- ============================================================================
-- TABLE: operator_stats
-- ============================================================================
-- Aggregated per-operator statistics: kills, deaths, deployment count.
-- One row per user + operator combination.

create table public.operator_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operator_id text not null,
  operator_name text not null,
  operator_side text not null check (operator_side in ('attacker', 'defender')),
  kills int not null default 0,
  deaths int not null default 0,
  deployments int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, operator_id)
);

alter table public.operator_stats enable row level security;

create policy "Users can manage own operator stats"
  on public.operator_stats for all
  using (auth.uid() = user_id);

create index idx_operator_stats_user_id on public.operator_stats(user_id);

create trigger set_updated_at
  before update on public.operator_stats
  for each row execute function public.update_updated_at();


-- ============================================================================
-- TABLE: gamification
-- ============================================================================
-- Tracks user XP, daily streaks, and activity for gamification features.
-- One row per user.

create table public.gamification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table public.gamification enable row level security;

create policy "Users can manage own gamification"
  on public.gamification for all
  using (auth.uid() = user_id);

create trigger set_updated_at
  before update on public.gamification
  for each row execute function public.update_updated_at();


-- ============================================================================
-- TABLE: achievements
-- ============================================================================
-- Records which achievements a user has unlocked and when.
-- One row per user + achievement combination.

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.achievements enable row level security;

create policy "Users can manage own achievements"
  on public.achievements for all
  using (auth.uid() = user_id);

create index idx_achievements_user_id on public.achievements(user_id);


-- ============================================================================
-- TABLE: content_ideas
-- ============================================================================
-- Stores content ideas generated by the AI content generator.
-- Tags and platforms are stored as JSONB arrays for flexibility.

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  tags jsonb not null default '[]',
  platforms jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_ideas enable row level security;

create policy "Users can manage own content ideas"
  on public.content_ideas for all
  using (auth.uid() = user_id);

create index idx_content_ideas_user_id on public.content_ideas(user_id);

create trigger set_updated_at
  before update on public.content_ideas
  for each row execute function public.update_updated_at();
