-- ==========================================
-- COURSE SPECIFIC POLLS
-- ==========================================

-- 1. Create course_polls table
CREATE TABLE IF NOT EXISTS public.course_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    is_multiple_choice BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create course_poll_options table
CREATE TABLE IF NOT EXISTS public.course_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.course_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create course_poll_votes table
CREATE TABLE IF NOT EXISTS public.course_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.course_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.course_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(poll_id, user_id, option_id) -- User can only vote once per option
);

-- Enable RLS
ALTER TABLE public.course_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_poll_votes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Anyone enrolled or faculty of the course can view polls
CREATE POLICY "Course participants can view polls"
    ON public.course_polls FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            WHERE e.course_id = course_polls.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
        ) OR
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_polls.course_id AND c.created_by = auth.uid()
        )
    );

-- Enrolled students/faculty can insert polls
CREATE POLICY "Course participants can insert polls"
    ON public.course_polls FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            WHERE e.course_id = course_polls.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
        ) OR
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_polls.course_id AND c.created_by = auth.uid()
        )
    );

-- Anyone enrolled or faculty can view options
CREATE POLICY "Course participants can view options"
    ON public.course_poll_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_polls cp
            LEFT JOIN public.enrollments e ON e.course_id = cp.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
            LEFT JOIN public.courses c ON c.id = cp.course_id AND c.created_by = auth.uid()
            WHERE cp.id = course_poll_options.poll_id AND (e.id IS NOT NULL OR c.id IS NOT NULL)
        )
    );

-- Poll creator can insert options
CREATE POLICY "Poll creator can insert options"
    ON public.course_poll_options FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_polls cp
            WHERE cp.id = course_poll_options.poll_id AND cp.created_by = auth.uid()
        )
    );

-- Anyone enrolled or faculty can view votes
CREATE POLICY "Course participants can view votes"
    ON public.course_poll_votes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_polls cp
            LEFT JOIN public.enrollments e ON e.course_id = cp.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
            LEFT JOIN public.courses c ON c.id = cp.course_id AND c.created_by = auth.uid()
            WHERE cp.id = course_poll_votes.poll_id AND (e.id IS NOT NULL OR c.id IS NOT NULL)
        )
    );

-- Anyone enrolled or faculty can insert votes (vote)
CREATE POLICY "Course participants can vote"
    ON public.course_poll_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.course_polls cp
            LEFT JOIN public.enrollments e ON e.course_id = cp.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
            LEFT JOIN public.courses c ON c.id = cp.course_id AND c.created_by = auth.uid()
            WHERE cp.id = course_poll_votes.poll_id AND (e.id IS NOT NULL OR c.id IS NOT NULL)
        )
    );

-- Anyone enrolled or faculty can delete their own votes (unvote)
CREATE POLICY "Users can remove their vote"
    ON public.course_poll_votes FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- 5. Trigger for notifying enrolled students when a poll is created
CREATE OR REPLACE FUNCTION notify_on_new_course_poll()
RETURNS trigger AS $$
DECLARE
    v_author_name TEXT;
    v_course_title TEXT;
BEGIN
    -- Get author name
    SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.created_by;
    
    -- Get course title
    SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;

    -- Insert a notification for every student enrolled in the course, except the author
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT e.user_id, 'notice', v_author_name || ' posted a new poll in "' || v_course_title || '"', '/courses/' || NEW.course_id
    FROM public.enrollments e
    WHERE e.course_id = NEW.course_id 
      AND e.status = 'approved' 
      AND e.user_id != NEW.created_by;

    -- If the author is a student, also notify the instructor (course creator)
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT c.created_by, 'notice', v_author_name || ' posted a new poll in "' || v_course_title || '"', '/courses/' || NEW.course_id
    FROM public.courses c
    WHERE c.id = NEW.course_id 
      AND c.created_by != NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_course_poll ON public.course_polls;
CREATE TRIGGER trigger_notify_on_new_course_poll
    AFTER INSERT ON public.course_polls
    FOR EACH ROW EXECUTE PROCEDURE notify_on_new_course_poll();
