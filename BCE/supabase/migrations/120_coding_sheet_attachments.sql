-- Add attachment fields and youtube_url to coding_sheets
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;
