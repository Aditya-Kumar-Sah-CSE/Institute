-- Update submissions RLS to allow enrolled students and faculty to view all submissions for their courses
DROP POLICY IF EXISTS "Users view own submissions" ON submissions;
DROP POLICY IF EXISTS "Users view submissions" ON submissions;

CREATE POLICY "Users view submissions" ON submissions FOR SELECT
USING (
  -- 1. User owns the submission
  auth.uid() = user_id 
  OR 
  -- 2. User is admin
  is_admin()
  OR
  -- 3. User is instructor of the course
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN lessons l ON l.id = a.lesson_id
    JOIN courses c ON c.id = l.course_id
    WHERE a.id = submissions.assignment_id
    AND c.created_by = auth.uid()
  )
  OR
  -- 4. User is enrolled in the course
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN lessons l ON l.id = a.lesson_id
    JOIN enrollments e ON e.course_id = l.course_id
    WHERE a.id = submissions.assignment_id
    AND e.user_id = auth.uid()
    AND e.status = 'approved'
  )
);
