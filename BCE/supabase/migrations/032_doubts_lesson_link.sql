-- Add course_id and lesson_id to doubts table
ALTER TABLE public.doubts 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;
