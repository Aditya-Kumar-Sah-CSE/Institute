DROP POLICY IF EXISTS "Course participants can view course notices" ON public.course_notices;
DROP POLICY IF EXISTS "Course participants and assigned faculty can view course notices" ON public.course_notices;
CREATE POLICY "Course participants and assigned faculty can view course notices"
  ON public.course_notices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_notices.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_notices.course_id AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_instructors ci
      WHERE ci.course_id = course_notices.course_id AND ci.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Course staff can create course notices" ON public.course_notices;
CREATE POLICY "Course staff can create course notices"
  ON public.course_notices FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_notices.course_id AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.course_instructors ci
        WHERE ci.course_id = course_notices.course_id AND ci.instructor_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );
