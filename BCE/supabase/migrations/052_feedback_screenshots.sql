-- 1. Add image_url to feedbacks table
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create the feedback_images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback_images', 'feedback_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS for the bucket
-- Allow any authenticated user to upload an image
CREATE POLICY "Anyone can upload feedback images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback_images');

-- Allow any authenticated user to view feedback images
CREATE POLICY "Anyone can view feedback images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feedback_images');

-- Allow users to update/delete their own images
CREATE POLICY "Users can update their own feedback images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'feedback_images' AND (auth.uid() = owner));

CREATE POLICY "Users can delete their own feedback images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback_images' AND (auth.uid() = owner));
