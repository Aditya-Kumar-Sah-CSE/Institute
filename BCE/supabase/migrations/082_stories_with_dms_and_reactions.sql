-- Migration: 082_stories_with_dms_and_reactions.sql
-- Description: Create comprehensive stories system with DM replies, reactions/likes, and proper RLS

-- ==========================================
-- 1. STORIES CONTAINER TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'contacts', 'close_friends', 'only_me', 'custom')),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 2. STORY ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.story_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    media_url TEXT,
    thumbnail_url TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'text')) DEFAULT 'text',
    caption TEXT,
    duration INTEGER NOT NULL DEFAULT 5,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 3. STORY VIEWS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(story_item_id, viewer_id)
);

-- ==========================================
-- 4. STORY REACTIONS/LIKES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(story_item_id, user_id)
);

-- ==========================================
-- 5. STORY REPLIES TABLE (for DMs)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.story_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 6. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_stories_user_id_active 
    ON public.stories(user_id, expires_at) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stories_expires_at 
    ON public.stories(expires_at) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_story_items_story_id 
    ON public.story_items(story_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_story_views_item_id 
    ON public.story_views(story_item_id);

CREATE INDEX IF NOT EXISTS idx_story_reactions_item_id 
    ON public.story_reactions(story_item_id);

CREATE INDEX IF NOT EXISTS idx_story_replies_item_id 
    ON public.story_replies(story_item_id);

CREATE INDEX IF NOT EXISTS idx_story_replies_sender_id 
    ON public.story_replies(sender_id);

-- ==========================================
-- 7. ENABLE RLS
-- ==========================================
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. RLS POLICIES - STORIES
-- ==========================================
-- SELECT: Anyone can view active stories that aren't deleted
CREATE POLICY "Anyone can view active stories" ON public.stories
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND deleted_at IS NULL 
        AND expires_at > now()
    );

-- INSERT: Users can create their own stories
CREATE POLICY "Users can create their own stories" ON public.stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own stories
CREATE POLICY "Users can update their own stories" ON public.stories
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Soft delete - users can delete their own stories
CREATE POLICY "Users can delete their own stories" ON public.stories
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 9. RLS POLICIES - STORY ITEMS
-- ==========================================
-- SELECT: Anyone can view active items from non-deleted, active stories
CREATE POLICY "Anyone can view active story items" ON public.story_items
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND deleted_at IS NULL 
        AND expires_at > now()
        AND story_id IN (
            SELECT id FROM stories WHERE deleted_at IS NULL AND expires_at > now()
        )
    );

-- INSERT: Users can add items to their own stories
CREATE POLICY "Users can add items to their own stories" ON public.story_items
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM stories WHERE id = story_id)
    );

-- UPDATE: Users can update items in their own stories
CREATE POLICY "Users can update items in their own stories" ON public.story_items
    FOR UPDATE USING (
        auth.uid() = (SELECT user_id FROM stories WHERE id = story_id)
    );

-- ==========================================
-- 10. RLS POLICIES - STORY VIEWS
-- ==========================================
-- SELECT: Anyone can see view counts
CREATE POLICY "Anyone can view story view records" ON public.story_views
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Users can record their own view
CREATE POLICY "Users can record their own views" ON public.story_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ==========================================
-- 11. RLS POLICIES - STORY REACTIONS (LIKES/HEARTS)
-- ==========================================
-- SELECT: Anyone can see reactions
CREATE POLICY "Anyone can view reactions" ON public.story_reactions
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Users can add their own reactions
CREATE POLICY "Users can add their own reactions" ON public.story_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can change their own reaction emoji
CREATE POLICY "Users can update their own reactions" ON public.story_reactions
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users can remove their own reactions
CREATE POLICY "Users can delete their own reactions" ON public.story_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 12. RLS POLICIES - STORY REPLIES (DMs)
-- ==========================================
-- SELECT: 
--   - Story owner can see all replies
--   - Sender can see their own replies
CREATE POLICY "Story owners and senders can view replies" ON public.story_replies
    FOR SELECT USING (
        auth.uid() = sender_id 
        OR auth.uid() = (SELECT user_id FROM story_items si JOIN stories s ON si.story_id = s.id WHERE si.id = story_item_id)
    );

-- INSERT: Anyone can reply to active stories
CREATE POLICY "Authenticated users can reply to stories" ON public.story_replies
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND story_item_id IN (
            SELECT id FROM story_items WHERE deleted_at IS NULL AND expires_at > now()
        )
    );

-- ==========================================
-- 13. REALTIME SUBSCRIPTIONS
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_replies;

-- ==========================================
-- 14. GRANT PERMISSIONS
-- ==========================================
GRANT ALL ON public.stories TO authenticated;
GRANT ALL ON public.story_items TO authenticated;
GRANT ALL ON public.story_views TO authenticated;
GRANT ALL ON public.story_reactions TO authenticated;
GRANT ALL ON public.story_replies TO authenticated;
