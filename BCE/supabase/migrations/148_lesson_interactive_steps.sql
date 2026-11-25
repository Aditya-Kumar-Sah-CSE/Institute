-- Add structured multi-part interactive steps JSONB column to lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS interactive_steps JSONB;

