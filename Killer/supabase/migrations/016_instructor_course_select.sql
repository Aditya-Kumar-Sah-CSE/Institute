-- Instructors can view their own courses regardless of publish status
DROP POLICY IF EXISTS "Instructors can view their own courses" ON courses;
CREATE POLICY "Instructors can view their own courses" 
  ON courses FOR SELECT 
  USING (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );
