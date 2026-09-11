-- Migration 137: Fix courses table RLS policies
-- Unifies and aligns SELECT, INSERT, UPDATE, and DELETE RLS policies on public.courses
-- ensuring that authorized Instructors, Admins, Super Admins, Developers, and Faculty
-- can create draft courses (is_published = false) and perform .insert(...).select('id') without RLS errors.

-- 1. Helper function for content creation permission check
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
        'instructor', 'admin', 'developer', 'super_admin', 'superadmin', 'faculty'
      )
      AND COALESCE(status, 'active') = 'active'
  );
$$;

-- 2. Ensure RLS is enabled on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 3. Drop all legacy/conflicting policies on courses
DROP POLICY IF EXISTS "Published courses viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Instructors can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Staff can insert courses they own" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Courses viewable by public or staff" ON public.courses;
DROP POLICY IF EXISTS "Staff can update authorized courses" ON public.courses;
DROP POLICY IF EXISTS "Staff can delete authorized courses" ON public.courses;

-- 4. Create unified RLS policies

-- SELECT: Public can see published non-deleted courses. Staff can see all owned/assigned courses (including unpublished drafts) or all courses if admin.
CREATE POLICY "Courses viewable by public or staff"
  ON public.courses
  FOR SELECT
  USING (
    (is_published = true AND (is_deleted IS NOT TRUE))
    OR
    public.is_admin()
    OR
    (
      public.can_create_learning_content()
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.course_instructors ci
          WHERE ci.course_id = courses.id
            AND ci.instructor_id = auth.uid()
        )
      )
    )
  );

-- INSERT: Authorized staff can insert courses setting created_by = auth.uid()
CREATE POLICY "Staff can insert courses they own"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_create_learning_content()
  );

-- UPDATE: Admins can update any course. Staff can update owned/assigned courses.
CREATE POLICY "Staff can update authorized courses"
  ON public.courses
  FOR UPDATE
  USING (
    public.is_admin()
    OR
    (
      public.can_create_learning_content()
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.course_instructors ci
          WHERE ci.course_id = courses.id
            AND ci.instructor_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR
    (
      public.can_create_learning_content()
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.course_instructors ci
          WHERE ci.course_id = courses.id
            AND ci.instructor_id = auth.uid()
        )
      )
    )
  );

-- DELETE: Admins can delete any course. Staff can delete courses they created.
CREATE POLICY "Staff can delete authorized courses"
  ON public.courses
  FOR DELETE
  USING (
    public.is_admin()
    OR
    (
      public.can_create_learning_content()
      AND created_by = auth.uid()
    )
  );

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
