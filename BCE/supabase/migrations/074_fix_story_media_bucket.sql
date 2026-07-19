-- Migration: 074_fix_story_media_bucket.sql
-- Description: Provisions the story_media bucket with correct RLS policies
--              so authenticated users can upload, and all users can read.

-- 1. Create bucket idempotently with constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story_media',
  'story_media',
  true,
  20971520, -- 20MB limit for video support
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 2. Drop old/broken policies idempotently before recreating
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
  DROP POLICY IF EXISTS "Insert Access to authenticated" ON storage.objects;
  DROP POLICY IF EXISTS "Delete Access to owner" ON storage.objects;
  DROP POLICY IF EXISTS "story_media_select" ON storage.objects;
  DROP POLICY IF EXISTS "story_media_insert" ON storage.objects;
  DROP POLICY IF EXISTS "story_media_delete" ON storage.objects;
END $$;

-- 3. SELECT: Anyone (incl. unauthenticated) can view since bucket is public
CREATE POLICY "story_media_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'story_media');

-- 4. INSERT: Only authenticated users can upload under their own user_id prefix
--    Files must be stored at: {user_id}/{filename}
CREATE POLICY "story_media_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story_media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. DELETE: Users can only delete their own files
CREATE POLICY "story_media_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story_media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
