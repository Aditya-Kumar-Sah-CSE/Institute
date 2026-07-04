-- Add enrollment_restriction column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_restriction TEXT DEFAULT 'any' CHECK (enrollment_restriction IN ('any', 'approval'));
