-- Instructors can manage lessons for their own courses
DROP POLICY IF EXISTS "Instructors can insert lessons" ON lessons;
CREATE POLICY "Instructors can insert lessons" 
  ON lessons FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors can update lessons" ON lessons;
CREATE POLICY "Instructors can update lessons" 
  ON lessons FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors can delete lessons" ON lessons;
CREATE POLICY "Instructors can delete lessons" 
  ON lessons FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

-- Instructors can manage assignments for lessons in their own courses
DROP POLICY IF EXISTS "Instructors can insert assignments" ON assignments;
CREATE POLICY "Instructors can insert assignments" 
  ON assignments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN courses ON courses.id = lessons.course_id
      WHERE lessons.id = lesson_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors can update assignments" ON assignments;
CREATE POLICY "Instructors can update assignments" 
  ON assignments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN courses ON courses.id = lessons.course_id
      WHERE lessons.id = lesson_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors can delete assignments" ON assignments;
CREATE POLICY "Instructors can delete assignments" 
  ON assignments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN courses ON courses.id = lessons.course_id
      WHERE lessons.id = lesson_id 
      AND courses.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );
