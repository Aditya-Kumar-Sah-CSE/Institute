-- Migration to allow 'CODECHEF' in student_external_accounts platform check constraint

ALTER TABLE public.student_external_accounts
  DROP CONSTRAINT IF EXISTS student_external_accounts_platform_check;

ALTER TABLE public.student_external_accounts
  ADD CONSTRAINT student_external_accounts_platform_check
  CHECK (platform IN ('CODEFORCES', 'LEETCODE', 'CODECHEF'));
