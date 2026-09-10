-- Keep database authorization aligned with the Smart Learn agent role hierarchy.
-- The agent still uses the authenticated Supabase client, so these policies remain
-- the final enforcement layer for course and coding-sheet mutations.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'superadmin', 'developer')
      AND COALESCE(status, 'active') = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.code_arena_is_instructor()
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
      AND role IN ('instructor', 'admin', 'developer', 'super_admin', 'superadmin')
      AND COALESCE(status, 'active') = 'active'
  );
$$;

-- Replace the legacy role-specific INSERT policies with one hierarchy-aware,
-- ownership-bound policy. RLS remains enabled and auth.uid() is the owner.
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can insert their own courses" ON public.courses;

CREATE POLICY "Staff can insert courses they own"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('instructor', 'admin', 'developer', 'super_admin', 'superadmin')
        AND COALESCE(status, 'active') = 'active'
    )
  );

CREATE POLICY "Admins can update courses"
  ON public.courses
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete courses"
  ON public.courses
  FOR DELETE
  USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
