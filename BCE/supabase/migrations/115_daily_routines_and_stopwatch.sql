-- Migration: 115_daily_routines_and_stopwatch.sql
-- Description: Adds stopwatch timer state and routine completions tracking.

-- Alter goal_sessions to support stopwatch parameters, tasks, and pause logic
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS task_name TEXT;
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS last_paused_at TIMESTAMPTZ;
ALTER TABLE public.goal_sessions ADD COLUMN IF NOT EXISTS cumulative_pause_seconds INT NOT NULL DEFAULT 0;

-- Table for daily routine completions
CREATE TABLE IF NOT EXISTS public.daily_routine_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id, completed_date)
);

-- Enable RLS for completions
ALTER TABLE public.daily_routine_completions ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create
DROP POLICY IF EXISTS "Users can CRUD own routine completions" ON public.daily_routine_completions;
CREATE POLICY "Users can CRUD own routine completions" ON public.daily_routine_completions
  FOR ALL USING (auth.uid() = user_id);

-- Drop policy if exists and create for instructors/admins
DROP POLICY IF EXISTS "Instructors can view all routine completions in their institution" ON public.daily_routine_completions;
CREATE POLICY "Instructors can view all routine completions in their institution" ON public.daily_routine_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin', 'superadmin')
    )
  );
