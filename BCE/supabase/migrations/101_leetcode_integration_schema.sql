-- Migration to support production-grade LeetCode integration in BCE Code Arena.
-- Add metadata, signature, starter code, and examples caching to coding_problems.

ALTER TABLE public.coding_problems
ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hints TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS follow_up TEXT,
ADD COLUMN IF NOT EXISTS signature JSONB,
ADD COLUMN IF NOT EXISTS starter_code JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Ensure that the unique constraint exists to support upsert/deduplication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'coding_problems_external_platform_external_problem_id_key'
    ) THEN
        ALTER TABLE public.coding_problems 
        ADD CONSTRAINT coding_problems_external_platform_external_problem_id_key 
        UNIQUE (external_platform, external_problem_id);
    END IF;
END $$;
