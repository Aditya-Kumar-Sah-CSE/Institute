-- Migration 119: Public Profile RLS Policies and External Accounts Visibility

-- 1. Alter default value of is_public to TRUE in student_external_accounts
ALTER TABLE public.student_external_accounts ALTER COLUMN is_public SET DEFAULT TRUE;

-- 2. Update existing accounts to be public so other students can see them
UPDATE public.student_external_accounts SET is_public = TRUE WHERE is_public = FALSE;

-- 3. Recreate SELECT policy on student_external_accounts to allow anyone to select
DROP POLICY IF EXISTS "Public coding accounts are visible" ON public.student_external_accounts;
CREATE POLICY "Public coding accounts are visible" ON public.student_external_accounts FOR SELECT USING (true);

-- 4. Recreate SELECT policy on coding_submissions so other students can view problem stats/submissions on profiles
DROP POLICY IF EXISTS "Code Arena students view own submissions" ON public.coding_submissions;
CREATE POLICY "Code Arena students view own submissions" ON public.coding_submissions FOR SELECT USING (true);

-- 5. Recreate SELECT policy on coding_battle_participants so other students can see battle counts on profiles
DROP POLICY IF EXISTS "Code Arena participants view battle roster" ON public.coding_battle_participants;
CREATE POLICY "Code Arena participants view battle roster" ON public.coding_battle_participants FOR SELECT USING (true);

-- 6. Recreate SELECT policy on enrollments so students can see each other's enrolled courses on profiles
DROP POLICY IF EXISTS "Users view own enrollments" ON public.enrollments;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT USING (true);
