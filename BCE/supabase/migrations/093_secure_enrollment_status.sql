-- Trigger function to prevent regular users from changing enrollment status
CREATE OR REPLACE FUNCTION public.check_enrollment_status_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      -- Check if the current user is an admin, instructor, or developer
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'instructor', 'developer')
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

DROP TRIGGER IF EXISTS trigger_check_enrollment_status_update ON public.enrollments;
CREATE TRIGGER trigger_check_enrollment_status_update
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE PROCEDURE check_enrollment_status_update();
