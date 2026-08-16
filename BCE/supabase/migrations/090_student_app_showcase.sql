-- Migration 090: Student App Showcase Schema
-- Creates student_apps table to showcase full-stack projects submitted by students after admin approval.

CREATE TABLE IF NOT EXISTS public.student_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  mobile_no TEXT NOT NULL,
  batch TEXT NOT NULL,
  problem_addressing TEXT NOT NULL,
  solution TEXT NOT NULL,
  working_url TEXT NOT NULL,
  app_name TEXT NOT NULL,
  app_logo_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_apps_status ON public.student_apps(status);
CREATE INDEX IF NOT EXISTS idx_student_apps_user_id ON public.student_apps(user_id);

-- Enable Row Level Security
ALTER TABLE public.student_apps ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Anyone can view approved student apps
DROP POLICY IF EXISTS "Anyone can view approved student apps" ON public.student_apps;
CREATE POLICY "Anyone can view approved student apps" ON public.student_apps
  FOR SELECT TO authenticated USING (status = 'approved');

-- 2. SELECT: Users can view their own submissions
DROP POLICY IF EXISTS "Users can see their own student apps" ON public.student_apps;
CREATE POLICY "Users can see their own student apps" ON public.student_apps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. SELECT: Admins/Instructors can view all submissions
DROP POLICY IF EXISTS "Instructors and admins can view all student apps" ON public.student_apps;
CREATE POLICY "Instructors and admins can view all student apps" ON public.student_apps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer')
    )
  );

-- 4. INSERT: Authenticated users can insert their own projects
DROP POLICY IF EXISTS "Authenticated users can submit student apps" ON public.student_apps;
CREATE POLICY "Authenticated users can submit student apps" ON public.student_apps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. ALL: Instructors/Admins can manage all status changes and entries
DROP POLICY IF EXISTS "Instructors and admins can manage student apps" ON public.student_apps;
CREATE POLICY "Instructors and admins can manage student apps" ON public.student_apps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer')
    )
  );

-- Grant privileges
GRANT ALL ON public.student_apps TO authenticated;
