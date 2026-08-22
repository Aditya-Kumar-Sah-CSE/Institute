-- Add enrollment access control to coding_sheets
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS enrollment_access TEXT NOT NULL DEFAULT 'public'
  CHECK (enrollment_access IN ('public', 'restricted', 'private'));

ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS enrollment_passcode TEXT DEFAULT NULL;

-- Create coding_sheet_enrollments table
CREATE TABLE IF NOT EXISTS public.coding_sheet_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sheet_id, user_id)
);

-- Enable RLS
ALTER TABLE public.coding_sheet_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can read their own enrollments
DROP POLICY IF EXISTS "Users read own sheet enrollments" ON public.coding_sheet_enrollments;
CREATE POLICY "Users read own sheet enrollments" ON public.coding_sheet_enrollments
  FOR SELECT USING (user_id = auth.uid() OR public.code_arena_is_instructor());

-- Users can insert their own enrollments (API enforces permission logic)
DROP POLICY IF EXISTS "Users insert own sheet enrollments" ON public.coding_sheet_enrollments;
CREATE POLICY "Users insert own sheet enrollments" ON public.coding_sheet_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Instructors can delete enrollments for sheets they own
DROP POLICY IF EXISTS "Instructors manage sheet enrollments" ON public.coding_sheet_enrollments;
CREATE POLICY "Instructors manage sheet enrollments" ON public.coding_sheet_enrollments
  FOR DELETE USING (
    public.code_arena_is_instructor() AND
    EXISTS (SELECT 1 FROM public.coding_sheets s WHERE s.id = sheet_id AND s.created_by = auth.uid())
  );

-- Performance index
CREATE INDEX IF NOT EXISTS idx_sheet_enrollments_sheet_user ON public.coding_sheet_enrollments(sheet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sheet_enrollments_user ON public.coding_sheet_enrollments(user_id);
