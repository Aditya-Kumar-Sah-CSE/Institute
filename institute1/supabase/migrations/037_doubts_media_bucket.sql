-- Create a storage bucket for doubts and replies media
INSERT INTO storage.buckets (id, name, public)
VALUES ('doubts_media', 'doubts_media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the doubts_media bucket
-- Allow public read access
CREATE POLICY "Public Access to doubts_media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'doubts_media' );

-- Allow authenticated users to upload to doubts_media bucket
CREATE POLICY "Authenticated users can upload to doubts_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'doubts_media' );

-- Allow authenticated users to update their own uploads (optional, but good practice)
CREATE POLICY "Authenticated users can update their own uploads in doubts_media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'doubts_media' AND auth.uid() = owner );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete from doubts_media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'doubts_media' AND auth.uid() = owner );
