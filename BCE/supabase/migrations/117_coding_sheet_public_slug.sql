-- Add public readable slug to coding_sheets
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Performance index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_coding_sheets_slug ON public.coding_sheets(slug);
