-- Migration: Create Standalone Stories Module
-- Idempotent & Safe Execution

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
DO $$ BEGIN
    CREATE TYPE story_privacy_level AS ENUM ('everyone', 'contacts', 'close_friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE story_media_type AS ENUM ('image', 'video', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Drop existing schemas for clean room
DROP TABLE IF EXISTS public.story_replies CASCADE;
DROP TABLE IF EXISTS public.story_reactions CASCADE;
DROP TABLE IF EXISTS public.story_views CASCADE;
DROP TABLE IF EXISTS public.story_items CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;

-- 2. Create Core Stories Table
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility story_privacy_level NOT NULL DEFAULT 'everyone',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '24 hours'),
    deleted_at TIMESTAMPTZ
);

-- 3. Create Story Items Table
CREATE TABLE public.story_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    media_url TEXT,
    thumbnail_url TEXT,
    media_type story_media_type NOT NULL DEFAULT 'image',
    caption TEXT,
    duration INTEGER DEFAULT 5, -- seconds
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '24 hours'),
    deleted_at TIMESTAMPTZ
);

-- 4. Create Story Views Table
CREATE TABLE public.story_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(story_item_id, viewer_id)
);

-- 5. Create Story Reactions Table
CREATE TABLE public.story_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create Story Replies Table
CREATE TABLE public.story_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turn on Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- Base Indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_items_story_id ON public.story_items(story_id);
CREATE INDEX IF NOT EXISTS idx_story_items_expires_at ON public.story_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_item_id ON public.story_views(story_item_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_item_id ON public.story_reactions(story_item_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_item_id ON public.story_replies(story_item_id);

-- trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stories_modtime ON public.stories;
CREATE TRIGGER update_stories_modtime
    BEFORE UPDATE ON public.stories
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Simple initial generic RLS policies (We will construct strict privacy functions in codebase)
DROP POLICY IF EXISTS "Stories are readable by authenticated users" ON public.stories;
CREATE POLICY "Stories are readable by authenticated users"
ON public.stories FOR SELECT TO authenticated
USING (deleted_at IS NULL AND expires_at > NOW());

DROP POLICY IF EXISTS "Users can insert own stories" ON public.stories;
CREATE POLICY "Users can insert own stories"
ON public.stories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories"
ON public.stories FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Polices for Story Items
DROP POLICY IF EXISTS "Story items are readable by authenticated users" ON public.story_items;
CREATE POLICY "Story items are readable by authenticated users"
ON public.story_items FOR SELECT TO authenticated
USING (deleted_at IS NULL AND expires_at > NOW());

DROP POLICY IF EXISTS "Users can insert own story items" ON public.story_items;
CREATE POLICY "Users can insert own story items"
ON public.story_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can run updates on own items" ON public.story_items;
CREATE POLICY "Users can run updates on own items"
ON public.story_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own items" ON public.story_items;
CREATE POLICY "Users can delete own items"
ON public.story_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));

-- Story Views Policies
DROP POLICY IF EXISTS "Authenticated users can select views" ON public.story_views;
CREATE POLICY "Authenticated users can select views"
ON public.story_views FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert views" ON public.story_views;
CREATE POLICY "Authenticated users can insert views"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = viewer_id);

-- Story Reactions Policies
DROP POLICY IF EXISTS "Authenticated users can read reactions" ON public.story_reactions;
CREATE POLICY "Authenticated users can read reactions"
ON public.story_reactions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reactions" ON public.story_reactions;
CREATE POLICY "Authenticated users can insert reactions"
ON public.story_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create Storage Bucket carefully handling duplicate errors
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story_media', 'story_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket RLS Policies for story_media (allow owners full access, readers read)
DROP POLICY IF EXISTS "Select Access to authenticated" ON storage.objects;
CREATE POLICY "Select Access to authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'story_media');

DROP POLICY IF EXISTS "Insert Access to owners" ON storage.objects;
CREATE POLICY "Insert Access to owners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'story_media' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Delete Access to owners" ON storage.objects;
CREATE POLICY "Delete Access to owners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'story_media' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Enable pg_cron cleanup if installed (Fallback provided if extension pg_cron unavailable via Supabase GUI)
-- We will just do a standard function which can be called via pg_cron or Edge function.
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
    UPDATE public.stories 
    SET deleted_at = NOW() 
    WHERE expires_at <= NOW() AND deleted_at IS NULL;
    
    UPDATE public.story_items
    SET deleted_at = NOW()
    WHERE expires_at <= NOW() AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



