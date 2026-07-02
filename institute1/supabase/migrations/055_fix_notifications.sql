-- Drop the poll notification trigger to avoid duplicate notifications
-- (The notifications are now handled perfectly in the server action `polls.ts`)

DROP TRIGGER IF EXISTS trigger_notify_on_new_course_poll ON public.course_polls;
DROP FUNCTION IF EXISTS notify_on_new_course_poll();
