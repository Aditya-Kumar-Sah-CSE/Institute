-- Migration: 116_add_status_to_routine_completions.sql
ALTER TABLE public.daily_routine_completions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
