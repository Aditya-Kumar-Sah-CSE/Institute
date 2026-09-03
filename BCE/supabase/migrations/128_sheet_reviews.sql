-- Migration 128: Practice Sheet Reviews System

-- 1. Create sheet_reviews table
CREATE TABLE IF NOT EXISTS public.sheet_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(sheet_id, user_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sheet_reviews_sheet_id ON public.sheet_reviews(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_reviews_user_id ON public.sheet_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_sheet_reviews_status ON public.sheet_reviews(status);

-- 3. Enable RLS
ALTER TABLE public.sheet_reviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for sheet_reviews
DROP POLICY IF EXISTS "Public sheet reviews are viewable by everyone" ON public.sheet_reviews;
CREATE POLICY "Public sheet reviews are viewable by everyone" 
ON public.sheet_reviews FOR SELECT 
USING (
  (status = 'published' AND is_public = true)
  OR auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert their sheet review" ON public.sheet_reviews;
CREATE POLICY "Authenticated users can insert their sheet review" 
ON public.sheet_reviews FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update own sheet review or staff can moderate" ON public.sheet_reviews;
CREATE POLICY "Users can update own sheet review or staff can moderate" 
ON public.sheet_reviews FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);

DROP POLICY IF EXISTS "Users or staff can delete sheet review" ON public.sheet_reviews;
CREATE POLICY "Users or staff can delete sheet review" 
ON public.sheet_reviews FOR DELETE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  )
);
