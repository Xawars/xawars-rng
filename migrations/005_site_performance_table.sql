-- Migration 005: Site Performance Table
-- Tracks per-operator per-map per-site kill/death/match stats.
-- Mirrors map_performance but adds site_id granularity for bomb-site-level insights.

CREATE TABLE IF NOT EXISTS public.site_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_performance_user_operator_map_site_key
    UNIQUE (user_id, operator_id, map_id, site_id),
  CONSTRAINT site_performance_kills_non_negative CHECK (kills >= 0),
  CONSTRAINT site_performance_deaths_non_negative CHECK (deaths >= 0),
  CONSTRAINT site_performance_matches_non_negative CHECK (matches >= 0)
);

-- Row Level Security
ALTER TABLE public.site_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_performance_owner" ON public.site_performance
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp on UPDATE
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.site_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index for fast lookups by user + operator (site breakdown panel)
CREATE INDEX idx_site_performance_user_operator
  ON public.site_performance (user_id, operator_id);

-- Index for fast lookups by user + map (map advisor site drill-down)
CREATE INDEX idx_site_performance_user_map
  ON public.site_performance (user_id, map_id);
