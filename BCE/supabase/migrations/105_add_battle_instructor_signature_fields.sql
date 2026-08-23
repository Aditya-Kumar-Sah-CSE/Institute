-- 105_add_battle_instructor_signature_fields.sql
-- Add instructor name, designation, and signature fields to coding_battles and certificates tables

DO $$
BEGIN
  -- Add columns to coding_battles if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='instructor_name') THEN
    ALTER TABLE public.coding_battles ADD COLUMN instructor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='instructor_designation') THEN
    ALTER TABLE public.coding_battles ADD COLUMN instructor_designation TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='instructor_signature') THEN
    ALTER TABLE public.coding_battles ADD COLUMN instructor_signature TEXT;
  END IF;

  -- Add snapshot columns to certificates if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='certificates' AND column_name='instructor_signature') THEN
    ALTER TABLE public.certificates ADD COLUMN instructor_signature TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='certificates' AND column_name='organizer_logo') THEN
    ALTER TABLE public.certificates ADD COLUMN organizer_logo TEXT;
  END IF;
END $$;
