-- Migration 086: Code Arena Lobby Status & Battle State Machine
-- Allows 'LOBBY' in public.coding_battles status check constraint.

DO $$ 
BEGIN
  -- Drop existing status check constraint if it exists
  ALTER TABLE public.coding_battles DROP CONSTRAINT IF EXISTS coding_battles_status_check;
  
  -- Add updated status check constraint supporting LOBBY
  ALTER TABLE public.coding_battles ADD CONSTRAINT coding_battles_status_check 
    CHECK (status IN ('DRAFT', 'LOBBY', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'));
END $$;
