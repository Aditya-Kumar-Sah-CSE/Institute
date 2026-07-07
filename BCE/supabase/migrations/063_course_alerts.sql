-- ==========================================
-- COURSE EMERGENCY ALERTS
-- ==========================================

-- 1. Create course_alerts table
CREATE TABLE IF NOT EXISTS public.course_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('cancel', 'asap', 'custom')),
    description TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.course_alerts ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies

-- Anyone enrolled or faculty of the course can view alerts
CREATE POLICY "Course participants can view alerts"
    ON public.course_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            WHERE e.course_id = course_alerts.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
        ) OR
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_alerts.course_id AND c.created_by = auth.uid()
        )
    );

-- Enrolled students/faculty can insert alerts
CREATE POLICY "Course participants can insert alerts"
    ON public.course_alerts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_alerts.course_id AND c.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            WHERE e.course_id = course_alerts.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'instructor')
        )
    );

-- Enrolled students/faculty can delete alerts
CREATE POLICY "Course participants can delete alerts"
    ON public.course_alerts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_alerts.course_id AND c.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            WHERE e.course_id = course_alerts.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'instructor')
        )
    );

-- 3. Trigger for notifying enrolled students when an alert is created
CREATE OR REPLACE FUNCTION notify_on_new_course_alert()
RETURNS trigger AS $$
DECLARE
    v_author_name TEXT;
    v_course_title TEXT;
    v_alert_message TEXT;
BEGIN
    -- Get author name
    SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.created_by;
    
    -- Get course title
    SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;

    -- Format alert message
    IF NEW.type = 'cancel' THEN
        v_alert_message := '🚨 URGENT: Class Cancelled for "' || v_course_title || '"';
    ELSIF NEW.type = 'asap' THEN
        v_alert_message := '🚨 URGENT: Come to class ASAP for "' || v_course_title || '"';
    ELSE
        v_alert_message := '🚨 Emergency Alert for "' || v_course_title || '"';
    END IF;

    -- Insert a notification for every student enrolled in the course, except the author
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT e.user_id, 'alert', v_alert_message, '/courses/' || NEW.course_id
    FROM public.enrollments e
    WHERE e.course_id = NEW.course_id 
      AND e.status = 'approved' 
      AND e.user_id != NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_course_alert ON public.course_alerts;
CREATE TRIGGER trigger_notify_on_new_course_alert
    AFTER INSERT ON public.course_alerts
    FOR EACH ROW EXECUTE PROCEDURE notify_on_new_course_alert();
