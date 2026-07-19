-- Migration: 072_ephemeral_stories.sql
-- Description: Creates the architecture for WhatsApp-style 24-hr status/stories generated from achievements.

-- 1. Create the Storage Bucket for Story Images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories_bucket', 'stories_bucket', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can view, Authenticated users can insert
CREATE POLICY "Public Read Access for Stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories_bucket');
CREATE POLICY "Authenticated users can upload Stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories_bucket' AND auth.role() = 'authenticated');

-- 2. Create the core hall_of_fame_stories table
CREATE TABLE IF NOT EXISTS public.hall_of_fame_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.hall_of_fame_stories ENABLE ROW LEVEL SECURITY;

-- Stories: Anyone can view ACTIVE stories. Users can insert their own.
CREATE POLICY "Active stories are visible to all users" ON public.hall_of_fame_stories
    FOR SELECT USING (expires_at > now());
    
CREATE POLICY "Users can create their own stories" ON public.hall_of_fame_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can delete their own stories" ON public.hall_of_fame_stories
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Create story_likes table
CREATE TABLE IF NOT EXISTS public.story_likes (
    story_id UUID NOT NULL REFERENCES public.hall_of_fame_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- Likes: Anyone can see likes, users can toggle their own
CREATE POLICY "Likes are visible to all users" ON public.story_likes
    FOR SELECT USING (true);
    
CREATE POLICY "Users can insert their own likes" ON public.story_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can delete their own likes" ON public.story_likes
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Create indexes for performance fetching active stories
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.hall_of_fame_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.hall_of_fame_stories(user_id);
