-- Migration: 112_student_goals_and_activity.sql
-- Description: Adds tables for student goals, goal sessions, and daily coding activity tracking.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: student_goals
CREATE TABLE IF NOT EXISTS public.student_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  duration_mins INT NOT NULL DEFAULT 30,
  routine BOOLEAN NOT NULL DEFAULT false,
  reminder_time TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: goal_sessions
CREATE TABLE IF NOT EXISTS public.goal_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.student_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_mins INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  progress_mins INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: daily_coding_activity
CREATE TABLE IF NOT EXISTS public.daily_coding_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  problems_solved INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, institution_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_goals_user_id ON public.student_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_sessions_goal_id ON public.goal_sessions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_sessions_user_id ON public.goal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_coding_activity_user_date ON public.daily_coding_activity(user_id, date);

-- Enable RLS
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_coding_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- student_goals
CREATE POLICY "Users can view own goals" ON public.student_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.student_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.student_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.student_goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view all goals in their institution" ON public.student_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin', 'superadmin')
    )
  );

-- goal_sessions
CREATE POLICY "Users can view own sessions" ON public.goal_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.goal_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.goal_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view all sessions in their institution" ON public.goal_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin', 'superadmin')
    )
  );

-- daily_coding_activity
CREATE POLICY "Users can view own activity" ON public.daily_coding_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.daily_coding_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity" ON public.daily_coding_activity
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view all activity in their institution" ON public.daily_coding_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin', 'superadmin')
    )
  );
