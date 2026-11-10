-- Migration 143: Allow super_admin in student_apps RLS and allow users to update their own pending submissions

DROP POLICY IF EXISTS "Instructors and admins can view all student apps" ON public.student_apps;
CREATE POLICY "Instructors and admins can view all student apps" ON public.student_apps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Instructors and admins can manage student apps" ON public.student_apps;
CREATE POLICY "Instructors and admins can manage student apps" ON public.student_apps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update their own pending student apps" ON public.student_apps;
CREATE POLICY "Users can update their own pending student apps" ON public.student_apps
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
