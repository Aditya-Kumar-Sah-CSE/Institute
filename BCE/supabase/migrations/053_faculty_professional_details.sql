-- Add professional details JSONB column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS professional_details JSONB DEFAULT '{}'::jsonb;
