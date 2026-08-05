-- Migration: 091_new_stories_architecture.sql
-- Description: Creates the missing tables for the updated v3 Stories architecture.

CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'everyone',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.story_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    media_url TEXT,
    thumbnail_url TEXT,
    media_type TEXT NOT NULL DEFAULT 'image',
    caption TEXT,
    duration INTEGER NOT NULL DEFAULT 5,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(story_item_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(story_item_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.story_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Anyone can view stories" ON public.stories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create their own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view story items" ON public.story_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert story items" ON public.story_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_items.story_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update story items" ON public.story_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_items.story_id AND user_id = auth.uid())
);

CREATE POLICY "Anyone can view views" ON public.story_views FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Anyone can view reactions" ON public.story_reactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can add reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update reactions" ON public.story_reactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view replies" ON public.story_replies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can add replies" ON public.story_replies FOR INSERT WITH CHECK (auth.uid() = sender_id);
