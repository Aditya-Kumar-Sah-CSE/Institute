-- =========================================================================
-- SECURITY TRIGGERS FOR PROFILES, SUBMISSIONS, AND ENROLLMENTS
-- =========================================================================

-- 1. PROFILE PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION protect_profile_fields() RETURNS trigger AS $$
BEGIN
  -- Revert any attempts by standard users (non-admins) to modify sensitive profile fields
  IF auth.role() = 'authenticated' AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    NEW.role := OLD.role;
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE protect_profile_fields();


-- 2. SUBMISSION PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION protect_submission_fields() RETURNS trigger AS $$
BEGIN
  -- Revert any attempts by standard users (non-admin, non-instructor) to auto-approve themselves
  IF auth.role() = 'authenticated' AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  ) THEN
    NEW.status := OLD.status;
    NEW.score := OLD.score;
    NEW.feedback := OLD.feedback;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_submission_update ON public.submissions;
CREATE TRIGGER on_submission_update
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE PROCEDURE protect_submission_fields();


-- 3. ENROLLMENT PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION protect_enrollment_fields() RETURNS trigger AS $$
BEGIN
  -- Revert any attempts by standard users (non-admin, non-instructor) to self-approve course enrollment
  IF auth.role() = 'authenticated' AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  ) THEN
    NEW.status := OLD.status;
    NEW.user_id := OLD.user_id;
    NEW.course_id := OLD.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_enrollment_update ON public.enrollments;
CREATE TRIGGER on_enrollment_update
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE PROCEDURE protect_enrollment_fields();
