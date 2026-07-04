-- Add admission_filled boolean to profiles to track if a student has completed the mandatory admission registration form.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admission_filled BOOLEAN DEFAULT false;
