CREATE TABLE IF NOT EXISTS public.course_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course participants can view course notices"
  ON public.course_notices FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_notices.course_id AND e.user_id = auth.uid() AND e.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_notices.course_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Course staff can create course notices"
  ON public.course_notices FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_notices.course_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );

CREATE POLICY "Notice authors and admins can delete course notices"
  ON public.course_notices FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.notify_on_new_course_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_title TEXT;
BEGIN
  SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
  INSERT INTO public.notifications (user_id, type, message, link)
  SELECT e.user_id, 'notice', 'New notice in "' || v_course_title || '": ' || NEW.title, '/courses/' || NEW.course_id
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id AND e.status = 'approved' AND e.user_id <> NEW.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_course_notice ON public.course_notices;
CREATE TRIGGER trigger_notify_on_new_course_notice
  AFTER INSERT ON public.course_notices
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_course_notice();
