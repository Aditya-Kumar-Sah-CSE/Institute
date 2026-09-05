-- Remove single-choice constraint to allow multi-correct options (e.g. 'A,C' or 'A,B,D')
ALTER TABLE public.course_mcqs DROP CONSTRAINT IF EXISTS course_mcqs_correct_option_check;
