-- Migration: 121_brick_breaker_premium.sql
-- Description: Adds tables and security configurations for the Brick Breaker Premium Challenge.

-- 1. Alter public.profiles to add coins if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Create public.breaker_progress table
CREATE TABLE IF NOT EXISTS public.breaker_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlocked_levels INTEGER[] DEFAULT ARRAY[1],
  level_scores JSONB DEFAULT '{}'::jsonb,
  stars JSONB DEFAULT '{}'::jsonb,
  completed_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  highest_wave INTEGER DEFAULT 0,
  best_infinite_score INTEGER DEFAULT 0,
  daily_streak INTEGER DEFAULT 0,
  last_played_date DATE,
  current_hearts INTEGER DEFAULT 3 CHECK (current_hearts >= 0 AND current_hearts <= 6),
  achievements JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create public.breaker_sessions table
CREATE TABLE IF NOT EXISTS public.breaker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('challenge', 'infinite')),
  level INTEGER,
  wave INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'invalidated')),
  server_validation_metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  validated_score INTEGER,
  suspicious_flag BOOLEAN DEFAULT false,
  suspicious_reason TEXT
);

-- 4. Create public.breaker_leaderboard table
CREATE TABLE IF NOT EXISTS public.breaker_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.breaker_sessions(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('challenge', 'infinite')),
  level INTEGER,
  wave INTEGER,
  score INTEGER NOT NULL,
  survival_time INTEGER NOT NULL, -- in seconds
  period_date DATE NOT NULL DEFAULT CURRENT_DATE, -- daily period bucket
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Add proper indexes
CREATE INDEX IF NOT EXISTS idx_breaker_leaderboard_user_id ON public.breaker_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_breaker_leaderboard_mode_score ON public.breaker_leaderboard(mode, score DESC);
CREATE INDEX IF NOT EXISTS idx_breaker_leaderboard_created_at ON public.breaker_leaderboard(created_at);
CREATE INDEX IF NOT EXISTS idx_breaker_leaderboard_period_date ON public.breaker_leaderboard(period_date);
CREATE INDEX IF NOT EXISTS idx_breaker_sessions_user_id ON public.breaker_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_breaker_sessions_status ON public.breaker_sessions(status);
CREATE INDEX IF NOT EXISTS idx_breaker_progress_highest_wave ON public.breaker_progress(highest_wave DESC);
CREATE INDEX IF NOT EXISTS idx_breaker_progress_best_infinite ON public.breaker_progress(best_infinite_score DESC);

-- 6. Enable RLS (Row Level Security)
ALTER TABLE public.breaker_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaker_leaderboard ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies

-- Policies for breaker_progress
DROP POLICY IF EXISTS select_own_progress ON public.breaker_progress;
CREATE POLICY select_own_progress ON public.breaker_progress 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS write_own_progress ON public.breaker_progress;
CREATE POLICY write_own_progress ON public.breaker_progress 
  FOR ALL USING (auth.uid() = user_id);

-- Policies for breaker_sessions
DROP POLICY IF EXISTS select_own_sessions ON public.breaker_sessions;
CREATE POLICY select_own_sessions ON public.breaker_sessions 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS write_own_sessions ON public.breaker_sessions;
CREATE POLICY write_own_sessions ON public.breaker_sessions 
  FOR ALL USING (auth.uid() = user_id);

-- Policies for breaker_leaderboard
-- Allow anyone authenticated to read scores
DROP POLICY IF EXISTS select_all_leaderboard ON public.breaker_leaderboard;
CREATE POLICY select_all_leaderboard ON public.breaker_leaderboard 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Writes to leaderboard must NOT be directly performable by the client.
-- Deny by default (no INSERT/UPDATE policies for public role).
-- Server actions or API using service-role or admin client bypass RLS.
