-- Migration: 076_fix_hall_of_fame_rls.sql
-- Description: The hall_of_fame table was missing RLS SELECT policies, rendering it unreadable to authenticated users, preventing stories from displaying in the frontend carousel.

DO $$
BEGIN
    -- Ensure RLS is formally enabled
    ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
    
    -- Drop colliding policies if they mistakenly existed but were broken
    DROP POLICY IF EXISTS "Active stories are visible to all users" ON public.hall_of_fame;
    DROP POLICY IF EXISTS "Active hall_of_fame are visible to all users" ON public.hall_of_fame;
    DROP POLICY IF EXISTS "Anyone can view hall_of_fame" ON public.hall_of_fame;
END $$;

-- Provide read access to all authenticated users for the hall_of_fame
CREATE POLICY "Authenticated users can read hall_of_fame" ON public.hall_of_fame
    FOR SELECT USING (auth.role() = 'authenticated' AND is_hidden = false);

-- Ensure users can also update/delete their own entries if needed
CREATE POLICY "Users can delete their own hall_of_fame" ON public.hall_of_fame
    FOR DELETE USING (auth.uid() = user_id);
