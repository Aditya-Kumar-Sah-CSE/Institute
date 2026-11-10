-- Fix Super Admin, Admin, and Service Role enrollment approval permissions

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND lower(role) IN ('admin', 'super_admin', 'superadmin', 'developer', 'platform_owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION protect_enrollment_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Revert any attempts by standard users (non-admin, non-instructor, non-superadmin) to self-approve course enrollment
  IF auth.role() = 'authenticated' AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND lower(role) IN ('admin', 'instructor', 'developer', 'super_admin', 'superadmin', 'platform_owner')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = NEW.course_id AND created_by = auth.uid()
  ) THEN
    NEW.status := OLD.status;
    NEW.user_id := OLD.user_id;
    NEW.course_id := OLD.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_enrollment_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Allow service role and internal server / direct bypass
    IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT (
      -- Check if the current user is an admin, instructor, developer, or super_admin
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND lower(role) IN ('admin', 'instructor', 'developer', 'super_admin', 'superadmin', 'platform_owner')
      ) OR
      -- Or check if the current user is the course creator
      EXISTS (
        SELECT 1 FROM public.courses 
        WHERE id = NEW.course_id 
        AND created_by = auth.uid()
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only instructors or admins can change enrollment status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Instructors and Admins update enrollments" ON public.enrollments;
CREATE POLICY "Instructors and Admins update enrollments" 
  ON public.enrollments FOR UPDATE 
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.created_by = auth.uid()
    )
  );
