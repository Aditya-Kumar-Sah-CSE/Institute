-- Migration 097: Anti-cheat tracking fields for coding_battle_participants
ALTER TABLE public.coding_battle_participants
  ADD COLUMN IF NOT EXISTS suspicious_paste_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_loss_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devtools_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspicious_log TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;
