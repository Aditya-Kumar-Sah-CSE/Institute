-- Add due_date column to assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
