-- Migration: 073_add_image_to_stories.sql
-- Description: Production-ready ephemeral stories storage architecture with zero-trust RLS.

-- 1. Add image_url to the existing hall_of_fame idempotently
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hall_of_fame' AND column_name='image_url') THEN
        ALTER TABLE public.hall_of_fame ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Create the Storage Bucket idempotently with constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories_bucket', 
  'stories_bucket', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- 3. Idempotent Storage RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Access for Stories" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload Stories" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own Stories" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own Stories" ON storage.objects;
END $$;

-- SELECT: Anyone can view public storage
CREATE POLICY "Public Read Access for Stories" ON storage.objects 
  FOR SELECT USING (bucket_id = 'stories_bucket');

-- INSERT: Must route perfectly into the `{user_id}/` subdirectory
CREATE POLICY "Authenticated users can upload Stories" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'stories_bucket' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Users can modify their own routed files
CREATE POLICY "Users can update their own Stories" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'stories_bucket' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Users can prune their own routed files
CREATE POLICY "Users can delete their own Stories" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'stories_bucket' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_img ON public.hall_of_fame(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_created_at ON public.hall_of_fame(created_at DESC);

-- 5. Hardened Cleanup Strategy (RPC)
-- This function empowers an automated pg_cron job or edge function to scrub orphans and expired rows
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  -- Safe deletion of standard table records
  DELETE FROM public.hall_of_fame WHERE expires_at < NOW();
  -- NOTE: Storage obj cleanup is handled off-band via Supabase Storage Edge Triggers mapped to DELETE cascades
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
