-- Add is_admission_pinned for global toggle
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS is_admission_pinned BOOLEAN DEFAULT false;
