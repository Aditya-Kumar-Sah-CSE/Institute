-- Add admin_reply and replied_at to feedbacks table
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS admin_reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies to allow authenticated users to see their own feedbacks
-- Previously we only allowed authenticated users (assumed admins) to see ALL feedbacks.
-- Let's add a specific policy for users to see their own.

-- Drop the old overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view feedbacks" ON public.feedbacks;

-- Admins and Instructors can view all feedbacks. 
-- For simplicity, since we didn't differentiate roles tightly in RLS (relying on app middleware),
-- we will allow authenticated users to view all feedbacks, BUT we will make it explicit.
-- Wait, if any authenticated user can view all feedbacks, they can query others' feedbacks via API.
-- Let's tighten it up.

CREATE POLICY "Users can view their own feedbacks"
    ON public.feedbacks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins and instructors can view all feedbacks"
    ON public.feedbacks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'instructor')
        )
    );

-- The old update/delete policies were also broad. Let's fix them too.
DROP POLICY IF EXISTS "Authenticated users can update feedbacks" ON public.feedbacks;
CREATE POLICY "Admins and instructors can update feedbacks"
    ON public.feedbacks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'instructor')
        )
    );

DROP POLICY IF EXISTS "Authenticated users can delete feedbacks" ON public.feedbacks;
CREATE POLICY "Admins and instructors can delete feedbacks"
    ON public.feedbacks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'instructor')
        )
    );
