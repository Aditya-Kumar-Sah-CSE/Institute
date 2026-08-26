-- Add public readable slug, is_public, and published_at to coding_sheets
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Ensure UNIQUE (slug) constraint safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coding_sheets_slug_key'
  ) THEN
    ALTER TABLE public.coding_sheets ADD CONSTRAINT coding_sheets_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Performance indexes for fast slug & public query lookup
CREATE INDEX IF NOT EXISTS idx_coding_sheets_slug ON public.coding_sheets(slug);
CREATE INDEX IF NOT EXISTS idx_coding_sheets_is_public ON public.coding_sheets(is_public);
CREATE INDEX IF NOT EXISTS idx_coding_sheets_public_published ON public.coding_sheets(is_public, published_at);

-- Safe backfill for existing sheets without a slug
UPDATE public.coding_sheets
SET 
  slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || SUBSTRING(id::text FROM 1 FOR 4),
  is_public = TRUE,
  published_at = created_at
WHERE slug IS NULL OR slug = '';
