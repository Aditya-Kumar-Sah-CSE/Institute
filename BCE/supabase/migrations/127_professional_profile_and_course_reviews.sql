-- Migration 127: SIH Professional Profile & Course Reviews System

-- 1. Extend profiles table with qualifications, work experience, skills, interests, and external certificates
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS external_certificates JSONB DEFAULT '[]'::jsonb;

-- 2. Create course_reviews table
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(course_id, user_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON public.course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_status ON public.course_reviews(status);

-- 4. Enable RLS
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for course_reviews
DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.course_reviews;
CREATE POLICY "Public reviews are viewable by everyone" 
ON public.course_reviews FOR SELECT 
USING (
  (status = 'published' AND is_public = true)
  OR auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);

DROP POLICY IF EXISTS "Enrolled users can insert their review" ON public.course_reviews;
CREATE POLICY "Enrolled users can insert their review" 
ON public.course_reviews FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = course_reviews.course_id 
      AND user_id = auth.uid() 
      AND status = 'approved'
  )
);

DROP POLICY IF EXISTS "Users can update own review or staff can moderate" ON public.course_reviews;
CREATE POLICY "Users can update own review or staff can moderate" 
ON public.course_reviews FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);

DROP POLICY IF EXISTS "Users or staff can delete review" ON public.course_reviews;
CREATE POLICY "Users or staff can delete review" 
ON public.course_reviews FOR DELETE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);
