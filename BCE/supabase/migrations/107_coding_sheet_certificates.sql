-- Add sheet_id column to certificates for coding sheet completion certificates
ALTER TABLE public.certificates 
  ADD COLUMN IF NOT EXISTS sheet_id UUID REFERENCES public.coding_sheets(id) ON DELETE CASCADE;

-- Drop old constraint and replace with one that accepts course OR battle OR sheet
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS check_course_or_battle;
ALTER TABLE public.certificates ADD CONSTRAINT check_course_battle_or_sheet 
  CHECK (
    (course_id IS NOT NULL AND battle_id IS NULL AND sheet_id IS NULL) OR 
    (course_id IS NULL AND battle_id IS NOT NULL AND sheet_id IS NULL) OR
    (course_id IS NULL AND battle_id IS NULL AND sheet_id IS NOT NULL)
  );

-- Unique constraint: one certificate per user per sheet
ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_sheet_unique UNIQUE (user_id, sheet_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_certificates_sheet_id ON public.certificates(sheet_id);
