-- 1. Add 'status' column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'suspended'));

-- 2. Update the 'role' constraint to include 'instructor'
-- First, find and drop the existing check constraint on 'role'.
-- The default name is usually 'profiles_role_check'. If that fails, we can do it dynamically, 
-- but in Supabase simple constraints are usually named by the column.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'instructor'));

-- 3. Create instructor_applications table
CREATE TABLE IF NOT EXISTS instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  experience TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own application" ON instructor_applications;
CREATE POLICY "Users can view their own application" 
  ON instructor_applications FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own application" ON instructor_applications;
CREATE POLICY "Users can insert their own application" 
  ON instructor_applications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all instructor applications" ON instructor_applications;
CREATE POLICY "Admins can view all instructor applications" 
  ON instructor_applications FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 4. Update Courses RLS Policies for Instructors
-- Wait, the `created_by` column is already in courses.
-- Let's ensure Instructors can INSERT their own courses.
DROP POLICY IF EXISTS "Instructors can insert their own courses" ON courses;
CREATE POLICY "Instructors can insert their own courses" 
  ON courses FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors can update their own courses" ON courses;
CREATE POLICY "Instructors can update their own courses" 
  ON courses FOR UPDATE 
  USING (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );
