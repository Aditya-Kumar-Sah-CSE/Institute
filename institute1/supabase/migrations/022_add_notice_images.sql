-- Add image_url to notices table
ALTER TABLE public.notices ADD COLUMN image_url TEXT;

-- Create a storage bucket for notice media
INSERT INTO storage.buckets (id, name, public)
VALUES ('notices_media', 'notices_media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the notices_media bucket
-- Allow public read access
CREATE POLICY "Public Access to notices_media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'notices_media' );

-- Allow authenticated users to upload to notices_media bucket
CREATE POLICY "Authenticated users can upload to notices_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'notices_media' );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete from notices_media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'notices_media' );
