-- ==========================================
-- GLOBAL POLLS SYSTEM
-- ==========================================

-- 1. Create global_polls table
CREATE TABLE IF NOT EXISTS public.global_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    is_multiple_choice BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create global_poll_options table
CREATE TABLE IF NOT EXISTS public.global_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.global_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create global_poll_votes table
CREATE TABLE IF NOT EXISTS public.global_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.global_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.global_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(poll_id, user_id, option_id) -- Prevent duplicate voting on same option
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.global_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_poll_votes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- SELECT POLICIES: Anyone authenticated can view polls, options, and votes
DROP POLICY IF EXISTS "Anyone authenticated can view global polls" ON public.global_polls;
CREATE POLICY "Anyone authenticated can view global polls"
    ON public.global_polls FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view global poll options" ON public.global_poll_options;
CREATE POLICY "Anyone authenticated can view global poll options"
    ON public.global_poll_options FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view global poll votes" ON public.global_poll_votes;
CREATE POLICY "Anyone authenticated can view global poll votes"
    ON public.global_poll_votes FOR SELECT
    TO authenticated
    USING (true);

-- INSERT POLICIES: Admin, instructor, developer, superadmin can create polls
DROP POLICY IF EXISTS "Authorized roles can insert global polls" ON public.global_polls;
CREATE POLICY "Authorized roles can insert global polls"
    ON public.global_polls FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND (role IN ('admin', 'instructor', 'developer', 'superadmin', 'super_admin') OR email = 'iambestadi@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Poll creator can insert global poll options" ON public.global_poll_options;
CREATE POLICY "Poll creator can insert global poll options"
    ON public.global_poll_options FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.global_polls gp
            WHERE gp.id = global_poll_options.poll_id AND gp.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.global_poll_votes;
CREATE POLICY "Authenticated users can vote"
    ON public.global_poll_votes FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- DELETE POLICIES: Creators or Admins/Developers/Superadmins can delete
DROP POLICY IF EXISTS "Authorized roles can delete global polls" ON public.global_polls;
CREATE POLICY "Authorized roles can delete global polls"
    ON public.global_polls FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND (role IN ('admin', 'developer', 'superadmin', 'super_admin') OR email = 'iambestadi@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Users can remove their own votes" ON public.global_poll_votes;
CREATE POLICY "Users can remove their own votes"
    ON public.global_poll_votes FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
    );

-- ==========================================
-- 5. TRIGGER FOR NOTIFICATIONS ON CREATION
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_global_poll()
RETURNS trigger AS $$
DECLARE
    v_author_name TEXT;
BEGIN
    -- Get author name
    SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.created_by;

    -- Insert a notification for every active user except the author
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT id, 'notice', v_author_name || ' created a global poll: "' || NEW.question || '"', '/polls'
    FROM public.profiles
    WHERE id != NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_global_poll ON public.global_polls;
CREATE TRIGGER trigger_notify_on_new_global_poll
    AFTER INSERT ON public.global_polls
    FOR EACH ROW EXECUTE PROCEDURE notify_on_new_global_poll();
