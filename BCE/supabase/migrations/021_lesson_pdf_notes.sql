-- Add pdf_url column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create a storage bucket for lesson notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_notes', 'lesson_notes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the lesson_notes bucket
-- Allow public read access
CREATE POLICY "Public Access to lesson_notes"
ON storage.objects FOR SELECT
USING ( bucket_id = 'lesson_notes' );

-- Allow authenticated users to upload to lesson_notes bucket
CREATE POLICY "Authenticated users can upload to lesson_notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'lesson_notes' );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete from lesson_notes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'lesson_notes' );
