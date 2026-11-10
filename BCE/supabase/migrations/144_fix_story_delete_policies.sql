-- Migration 144: Add DELETE policies for stories, story_items, story_views, and story_replies

-- 1. story_views delete policy (story owner can delete views on their story items)
DROP POLICY IF EXISTS "Story owners can delete views on their items" ON public.story_views;
CREATE POLICY "Story owners can delete views on their items" ON public.story_views
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.story_items si
      JOIN public.stories s ON si.story_id = s.id
      WHERE si.id = story_item_id AND s.user_id = auth.uid()
    )
    OR viewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'developer')
    )
  );

-- 2. story_replies delete policy
DROP POLICY IF EXISTS "Story owners and senders can delete replies" ON public.story_replies;
CREATE POLICY "Story owners and senders can delete replies" ON public.story_replies
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.story_items si
      JOIN public.stories s ON si.story_id = s.id
      WHERE si.id = story_item_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'developer')
    )
  );

-- 3. story_reactions delete policy
DROP POLICY IF EXISTS "Story owners can delete reactions on their items" ON public.story_reactions;
CREATE POLICY "Story owners can delete reactions on their items" ON public.story_reactions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.story_items si
      JOIN public.stories s ON si.story_id = s.id
      WHERE si.id = story_item_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'developer')
    )
  );

-- 4. story_items delete policy
DROP POLICY IF EXISTS "Users can delete own items" ON public.story_items;
CREATE POLICY "Users can delete own items" ON public.story_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'developer')
    )
  );

-- 5. stories delete policy
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'developer')
    )
  );
