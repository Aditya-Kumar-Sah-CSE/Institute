-- Adding expires_at to notices
ALTER TABLE public.notices ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NOW() + interval '6 months';
