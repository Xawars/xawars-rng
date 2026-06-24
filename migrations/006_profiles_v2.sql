-- ============================================================================
-- XAWARS RNG — Profiles Table (v2 Schema)
-- ============================================================================
-- Creates the profiles table matching the clean-slate database design.
-- Drops the old profiles table if it exists.
--
-- Prerequisites: auth.users must exist (Supabase provides this).
-- ============================================================================

-- Drop old trigger + function if they exist from 001_initial_schema
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Ensure the updated_at utility exists (idempotent)
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Extends auth.users with application-specific identity.
-- 1:1 with auth.users, auto-created via trigger on signup.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  callsign text not null constraint callsign_length check (char_length(callsign) between 3 and 20),
  avatar_url text,
  current_rank text,
  peak_rank text,
  rank_points int,
  platform text check (platform in ('PC', 'Console')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Callsign must be unique across all users
create unique index idx_profiles_callsign on public.profiles (callsign);

-- ============================================================================
-- RLS: users can read and update their own profile only
-- ============================================================================
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow the trigger function (security definer) to insert the user's own row
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================================
-- Fires after a new row is inserted into auth.users.
-- Derives callsign from provider metadata or falls back to email prefix.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  _callsign text;
begin
  _callsign := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Truncate to 20 chars, pad to 3 if too short
  _callsign := left(_callsign, 20);
  if char_length(_callsign) < 3 then
    _callsign := _callsign || repeat('_', 3 - char_length(_callsign));
  end if;

  insert into public.profiles (id, callsign, avatar_url)
  values (
    new.id,
    _callsign,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Prevent direct RPC calls — this function is only for the auth trigger
revoke execute on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
