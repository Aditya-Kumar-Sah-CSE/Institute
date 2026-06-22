-- Update submissions RLS policy so instructors can view submissions for their own courses
-- Currently it's: (auth.uid() = user_id OR is_admin())
-- We need to add: OR (user is instructor of the course)

DROP POLICY IF EXISTS "Users view own submissions" ON submissions;

CREATE POLICY "Users view own submissions" ON submissions 
FOR SELECT USING (
  auth.uid() = user_id 
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM assignments
    JOIN lessons ON lessons.id = assignments.lesson_id
    JOIN courses ON courses.id = lessons.course_id
    WHERE assignments.id = submissions.assignment_id
    AND courses.created_by = auth.uid()
  )
);

-- Also update update policy so instructors can approve/reject
DROP POLICY IF EXISTS "Users update own submissions" ON submissions;

CREATE POLICY "Users update own submissions" ON submissions 
FOR UPDATE USING (
  auth.uid() = user_id 
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM assignments
    JOIN lessons ON lessons.id = assignments.lesson_id
    JOIN courses ON courses.id = lessons.course_id
    WHERE assignments.id = submissions.assignment_id
    AND courses.created_by = auth.uid()
  )
);

-- Also update delete policy so instructors can delete approved submissions
DROP POLICY IF EXISTS "Users delete own submissions" ON submissions;

CREATE POLICY "Users delete own submissions" ON submissions 
FOR DELETE USING (
  auth.uid() = user_id 
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM assignments
    JOIN lessons ON lessons.id = assignments.lesson_id
    JOIN courses ON courses.id = lessons.course_id
    WHERE assignments.id = submissions.assignment_id
    AND courses.created_by = auth.uid()
  )
);
