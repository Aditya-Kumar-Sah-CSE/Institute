-- 1. Add 'status' column to enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Update existing enrollments to 'approved' to avoid breaking current users
UPDATE enrollments SET status = 'approved' WHERE status = 'pending';

-- 3. RLS Policies for Instructors to manage enrollments
-- Drop if exists to be idempotent
DROP POLICY IF EXISTS "Instructors view enrollments for their courses" ON enrollments;
CREATE POLICY "Instructors view enrollments for their courses" 
  ON enrollments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Instructors update enrollments for their courses" ON enrollments;
CREATE POLICY "Instructors update enrollments for their courses" 
  ON enrollments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.created_by = auth.uid()
    )
  );
