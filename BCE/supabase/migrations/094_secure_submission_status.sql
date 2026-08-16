-- Trigger function to prevent regular users from changing submission status or xp_awarded
CREATE OR REPLACE FUNCTION public.check_submission_status_update()
RETURNS trigger AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.xp_awarded IS DISTINCT FROM NEW.xp_awarded) THEN
    IF NOT (
      -- Check if current user is admin, instructor, or developer
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'instructor', 'developer')
      ) OR
      -- Or check if current user is the course instructor
      EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.lessons l ON l.id = a.lesson_id
        JOIN public.courses c ON c.id = l.course_id
        WHERE a.id = NEW.assignment_id
        AND c.created_by = auth.uid()
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only instructors or admins can change submission status or XP.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_submission_status_update ON public.submissions;
CREATE TRIGGER trigger_check_submission_status_update
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE PROCEDURE check_submission_status_update();
