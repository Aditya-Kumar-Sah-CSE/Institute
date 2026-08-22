-- 104_add_battle_organizer_fields.sql
-- Add organizer_name and organizer_logo to public.coding_battles

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='organizer_name') THEN
    ALTER TABLE public.coding_battles ADD COLUMN organizer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='organizer_logo') THEN
    ALTER TABLE public.coding_battles ADD COLUMN organizer_logo TEXT;
  END IF;
END $$;
