-- Centralize the Smart Learn roles allowed to create courses and coding sheets.
-- The caller still uses the authenticated Supabase client; RLS remains the
-- final authorization layer for every insert.
CREATE OR REPLACE FUNCTION public.can_create_learning_content()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND lower(trim(role)) IN (
        'instructor', 'admin', 'developer', 'super_admin', 'superadmin'
      )
      AND COALESCE(status, 'active') = 'active'
  );
$$;

DROP POLICY IF EXISTS "Staff can insert courses they own" ON public.courses;
DROP POLICY IF EXISTS "Instructors can insert their own courses" ON public.courses;
CREATE POLICY "Staff can insert courses they own"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_create_learning_content()
  );

DROP POLICY IF EXISTS "Code Arena instructors manage owned sheets" ON public.coding_sheets;
CREATE POLICY "Code Arena instructors manage owned sheets"
  ON public.coding_sheets
  FOR ALL
  USING (created_by = auth.uid() OR public.can_create_learning_content())
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_create_learning_content()
  );

NOTIFY pgrst, 'reload schema';