-- Migration 129: Allow developer role in profiles_role_check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'instructor', 'developer', 'super_admin', 'superadmin'));

NOTIFY pgrst, 'reload schema';
