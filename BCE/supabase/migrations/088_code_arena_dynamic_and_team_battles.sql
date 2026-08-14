-- Migration 088: Dynamic and Team Battles Schema
-- Adds support for custom participant limits and team join modes with host-configured team sizes.

-- 1. Add fields to coding_battles
ALTER TABLE public.coding_battles 
  ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 25 CHECK (max_participants > 0),
  ADD COLUMN IF NOT EXISTS team_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_team_size INTEGER NOT NULL DEFAULT 1 CHECK (min_team_size > 0),
  ADD COLUMN IF NOT EXISTS max_team_size INTEGER NOT NULL DEFAULT 1 CHECK (max_team_size >= min_team_size);

-- 2. Create coding_battle_teams table
CREATE TABLE IF NOT EXISTS public.coding_battle_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_battle_teams_battle_id ON public.coding_battle_teams(battle_id);

-- 3. Add team_id to coding_battle_participants
ALTER TABLE public.coding_battle_participants
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.coding_battle_teams(id) ON DELETE SET NULL;

-- 4. Enable RLS on coding_battle_teams
ALTER TABLE public.coding_battle_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for coding_battle_teams
CREATE POLICY "Battle teams visible to battle participants or instructors" ON public.coding_battle_teams
  FOR SELECT USING (
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid()) OR
    public.code_arena_is_battle_participant(battle_id, auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.coding_battles b 
      WHERE b.id = battle_id AND (b.visibility = 'CODE' OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "Battle participants manage own teams" ON public.coding_battle_teams
  FOR ALL USING (
    created_by = auth.uid() OR 
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid())
  );

-- 5. Re-create code_arena_can_join_battle with dynamic max_participants check
CREATE OR REPLACE FUNCTION public.code_arena_can_join_battle(battle_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  participant_count INTEGER;
  max_part INTEGER;
  already_joined BOOLEAN;
  has_access BOOLEAN;
BEGIN
  -- 1. Check if user is already a participant
  SELECT EXISTS (
    SELECT 1 
    FROM public.coding_battle_participants 
    WHERE battle_id = battle_uuid AND student_id = student_uuid
  ) INTO already_joined;

  IF already_joined THEN
    RETURN FALSE;
  END IF;

  -- 2. Acquire row lock on battle to ensure atomic join count validation (concurrency protection)
  PERFORM 1 FROM public.coding_battles WHERE id = battle_uuid FOR UPDATE;

  -- 3. Check participant cap (dynamic limit from battle)
  SELECT COALESCE(max_participants, 25) INTO max_part
  FROM public.coding_battles
  WHERE id = battle_uuid;

  SELECT COUNT(*) INTO participant_count 
  FROM public.coding_battle_participants 
  WHERE battle_id = battle_uuid;

  IF participant_count >= max_part THEN
    RETURN FALSE;
  END IF;

  -- 4. Check battle existence, joinable status ('DRAFT', 'LOBBY', 'SCHEDULED', 'LIVE'), and visibility rules
  SELECT EXISTS (
    SELECT 1 
    FROM public.coding_battles b
    LEFT JOIN public.profiles p ON p.id = student_uuid
    WHERE b.id = battle_uuid
      AND b.status IN ('DRAFT', 'LOBBY', 'SCHEDULED', 'LIVE')
      AND (
        b.visibility = 'CODE' OR
        b.created_by = student_uuid OR
        (b.batch_id IS NULL OR b.batch_id = p.graduation_period)
      )
  ) INTO has_access;

  RETURN COALESCE(has_access, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.code_arena_can_join_battle(UUID, UUID) TO authenticated, service_role;
