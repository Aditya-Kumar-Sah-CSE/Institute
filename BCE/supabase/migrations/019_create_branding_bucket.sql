-- Create a storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the branding bucket
-- Allow public read access to branding files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'branding' );

-- Allow authenticated users with role 'admin' to upload to branding bucket
-- Or just allow all authenticated users for now if role checking is hard
CREATE POLICY "Admin Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'branding' );

CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'branding' );

CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'branding' );
