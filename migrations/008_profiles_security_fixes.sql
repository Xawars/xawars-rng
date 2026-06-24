-- ============================================================================
-- XAWARS RNG — Security fixes for profiles-related functions/policies
-- ============================================================================
-- Addresses Supabase linter warnings:
--   - Function search_path mutable (update_updated_at, handle_new_user)
--   - RLS policy always true (System can insert profiles)
--   - SECURITY DEFINER callable by anon/authenticated (handle_new_user)
-- ============================================================================

-- Fix: set immutable search_path on update_updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';

-- Fix: set immutable search_path on handle_new_user
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

-- Fix: prevent direct RPC calls to handle_new_user
-- Must revoke from `public` pseudo-role (default grant) as well
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Fix: replace permissive insert policy with scoped one
drop policy if exists "System can insert profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
