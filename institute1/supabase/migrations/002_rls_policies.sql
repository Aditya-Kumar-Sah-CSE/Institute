-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- POLICIES
-- ==========================================

-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());


-- COMPANY SETTINGS
DROP POLICY IF EXISTS "Settings viewable by everyone" ON company_settings;
CREATE POLICY "Settings viewable by everyone" ON company_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON company_settings;
CREATE POLICY "Admins can update settings" ON company_settings FOR UPDATE USING (is_admin());


-- COURSES
DROP POLICY IF EXISTS "Published courses viewable by everyone" ON courses;
CREATE POLICY "Published courses viewable by everyone" ON courses FOR SELECT USING (is_published = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses FOR ALL USING (is_admin());


-- LESSONS & ASSIGNMENTS
DROP POLICY IF EXISTS "Lessons viewable by everyone" ON lessons;
CREATE POLICY "Lessons viewable by everyone" ON lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Assignments viewable by everyone" ON assignments;
CREATE POLICY "Assignments viewable by everyone" ON assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
CREATE POLICY "Admins can manage lessons" ON lessons FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage assignments" ON assignments;
CREATE POLICY "Admins can manage assignments" ON assignments FOR ALL USING (is_admin());


-- SUBMISSIONS
DROP POLICY IF EXISTS "Users view own submissions" ON submissions;
CREATE POLICY "Users view own submissions" ON submissions FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users manage own submissions" ON submissions;
CREATE POLICY "Users manage own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own submissions" ON submissions;
CREATE POLICY "Users update own submissions" ON submissions FOR UPDATE USING (auth.uid() = user_id OR is_admin());


-- BADGES
DROP POLICY IF EXISTS "Badges viewable by everyone" ON badges;
CREATE POLICY "Badges viewable by everyone" ON badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (is_admin());


-- USER BADGES
DROP POLICY IF EXISTS "User badges viewable by everyone" ON user_badges;
CREATE POLICY "User badges viewable by everyone" ON user_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage user badges" ON user_badges;
CREATE POLICY "Admins manage user badges" ON user_badges FOR ALL USING (is_admin());


-- XP LOG
DROP POLICY IF EXISTS "Users view own xp log" ON xp_log;
CREATE POLICY "Users view own xp log" ON xp_log FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admins manage xp log" ON xp_log;
CREATE POLICY "Admins manage xp log" ON xp_log FOR ALL USING (is_admin());


-- ENROLLMENTS & PROGRESS
DROP POLICY IF EXISTS "Users view own enrollments" ON enrollments;
CREATE POLICY "Users view own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users view own progress" ON lesson_progress;
CREATE POLICY "Users view own progress" ON lesson_progress FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users manage own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users insert own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users update own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users delete own enrollments" ON enrollments;

CREATE POLICY "Users insert own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own enrollments" ON enrollments FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users delete own enrollments" ON enrollments FOR DELETE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users manage own progress" ON lesson_progress;
CREATE POLICY "Users manage own progress" ON lesson_progress FOR ALL USING (auth.uid() = user_id OR is_admin());
