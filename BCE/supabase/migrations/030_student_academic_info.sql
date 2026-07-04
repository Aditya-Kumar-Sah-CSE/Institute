-- Add academic info to profiles table
ALTER TABLE profiles
ADD COLUMN graduation_period TEXT,
ADD COLUMN cgpa NUMERIC(4,2),
ADD COLUMN sgpa JSONB DEFAULT '{}'::jsonb;
