-- Migration 124: Student Workspace Files for Browser Shell & File Explorer
CREATE TABLE IF NOT EXISTS public.student_workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'directory')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, path)
);

-- Enable Row Level Security
ALTER TABLE public.student_workspace_files ENABLE ROW LEVEL SECURITY;

-- Add RLS Policy for students to manage their own files
CREATE POLICY "Students manage their own workspace files" 
  ON public.student_workspace_files
  FOR ALL 
  USING (student_id = auth.uid()) 
  WITH CHECK (student_id = auth.uid());

-- Index for fast lookup by student and path
CREATE INDEX IF NOT EXISTS idx_student_workspace_files_lookup 
  ON public.student_workspace_files(student_id, path);
