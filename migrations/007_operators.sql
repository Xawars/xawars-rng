-- ============================================================================
-- XAWARS RNG — Operators Table
-- ============================================================================
-- Core domain table: all R6S operators with metadata.
-- Public read, admin-only write (via service_role key).
-- ============================================================================

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  codename text not null unique,
  role text not null check (role in ('ATTACKER', 'DEFENDER')),
  organization text not null,
  country text not null,
  release_season text not null,
  release_year smallint not null,
  health smallint not null check (health between 1 and 3),
  speed smallint not null check (speed between 1 and 3),
  difficulty smallint not null check (difficulty between 1 and 3),
  ability_name text not null,
  ability_description text not null,
  playstyles text[] not null default '{}',
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  icon_url text,
  portrait_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_operators_role on public.operators (role);

-- ============================================================================
-- RLS: public read, admin-only write
-- ============================================================================
alter table public.operators enable row level security;

create policy "Public read operators"
  on public.operators for select
  using (true);

-- Writes happen via service_role key (bypasses RLS)

-- ============================================================================
-- Auto-update updated_at
-- ============================================================================
create trigger set_updated_at
  before update on public.operators
  for each row execute function public.update_updated_at();
