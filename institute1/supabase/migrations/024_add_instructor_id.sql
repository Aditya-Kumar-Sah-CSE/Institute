-- Add instructor_id to profiles and instructor_applications tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instructor_id TEXT;
ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS instructor_id TEXT;
