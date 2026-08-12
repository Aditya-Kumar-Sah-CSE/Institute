-- Migration 087: Fix RLS Policy Recursion in Code Arena
-- Introduces security definer helper functions to bypass RLS internally and breaks circular SELECT policies.

-- ========================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ========================================================

-- Helper 1: Check if user is the battle creator
CREATE OR REPLACE FUNCTION public.code_arena_is_battle_creator(battle_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coding_battles 
    WHERE id = battle_uuid AND created_by = user_uuid
  );
$$;

-- Helper 2: Check if user is an active battle participant
CREATE OR REPLACE FUNCTION public.code_arena_is_battle_participant(battle_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coding_battle_participants 
    WHERE battle_id = battle_uuid AND student_id = student_uuid
  );
$$;

-- Helper 3: Check if user is a participant in an ongoing LIVE battle
CREATE OR REPLACE FUNCTION public.code_arena_is_battle_live_participant(battle_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coding_battles b
    JOIN public.coding_battle_participants bp ON bp.battle_id = b.id
    WHERE b.id = battle_uuid 
      AND bp.student_id = student_uuid 
      AND b.status = 'LIVE' 
      AND (b.end_time IS NULL OR NOW() < b.end_time)
  );
$$;

-- Helper 4: Validate if user can join battle (cap < 25, visibility, duplicate join prevention, atomic lock)
CREATE OR REPLACE FUNCTION public.code_arena_can_join_battle(battle_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  participant_count INTEGER;
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

  -- 3. Check participant cap (< 25)
  SELECT COUNT(*) INTO participant_count 
  FROM public.coding_battle_participants 
  WHERE battle_id = battle_uuid;

  IF participant_count >= 25 THEN
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

-- ========================================================
-- 2. SECURITY DEFINER PERMISSIONS HARDENING
-- ========================================================

REVOKE EXECUTE ON FUNCTION public.code_arena_is_battle_creator(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.code_arena_is_battle_participant(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.code_arena_is_battle_live_participant(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.code_arena_can_join_battle(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.code_arena_is_battle_creator(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.code_arena_is_battle_participant(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.code_arena_is_battle_live_participant(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.code_arena_can_join_battle(UUID, UUID) TO authenticated, service_role;

-- ========================================================
-- 3. DROP PROBLEMATIC CIRCULAR RLS POLICIES
-- ========================================================

DROP POLICY IF EXISTS "Code Arena battles visible to faculty and participants" ON public.coding_battles;
DROP POLICY IF EXISTS "Code Arena battles visible to users" ON public.coding_battles;
DROP POLICY IF EXISTS "Code Arena instructors manage owned battles" ON public.coding_battles;
DROP POLICY IF EXISTS "Code Arena users create and manage owned battles" ON public.coding_battles;

DROP POLICY IF EXISTS "Code Arena instructors manage battle problems" ON public.coding_battle_problems;
DROP POLICY IF EXISTS "Code Arena battle problems readable with battle" ON public.coding_battle_problems;
DROP POLICY IF EXISTS "Code Arena battle creators manage battle problems" ON public.coding_battle_problems;

DROP POLICY IF EXISTS "Code Arena participants view battle roster" ON public.coding_battle_participants;
DROP POLICY IF EXISTS "Code Arena participants join assigned battles" ON public.coding_battle_participants;
DROP POLICY IF EXISTS "Code Arena participants join battles" ON public.coding_battle_participants;

DROP POLICY IF EXISTS "Code Arena students create own valid submissions" ON public.coding_submissions;

-- ========================================================
-- 4. RECREATE EQUIVALENT RECURSION-FREE RLS POLICIES
-- ========================================================

-- On public.coding_battles
CREATE POLICY "Code Arena battles visible to users" ON public.coding_battles
  FOR SELECT USING (
    created_by = auth.uid() OR
    visibility = 'CODE' OR
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_participant(id, auth.uid())
  );

CREATE POLICY "Code Arena users create and manage owned battles" ON public.coding_battles
  FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor())
  WITH CHECK (created_by = auth.uid() OR public.code_arena_is_instructor());

-- On public.coding_battle_problems
CREATE POLICY "Code Arena battle problems readable with battle" ON public.coding_battle_problems
  FOR SELECT USING (
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid()) OR
    public.code_arena_is_battle_participant(battle_id, auth.uid())
  );

CREATE POLICY "Code Arena battle creators manage battle problems" ON public.coding_battle_problems
  FOR ALL USING (
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid())
  )
  WITH CHECK (
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid())
  );

-- On public.coding_battle_participants
CREATE POLICY "Code Arena participants view battle roster" ON public.coding_battle_participants
  FOR SELECT USING (
    student_id = auth.uid() OR
    public.code_arena_is_instructor() OR
    public.code_arena_is_battle_creator(battle_id, auth.uid()) OR
    public.code_arena_is_battle_participant(battle_id, auth.uid())
  );

CREATE POLICY "Code Arena participants join battles" ON public.coding_battle_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    public.code_arena_can_join_battle(battle_id, auth.uid())
  );

-- On public.coding_submissions
CREATE POLICY "Code Arena students create own valid submissions" ON public.coding_submissions
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND p.is_published) AND
    (battle_id IS NULL OR public.code_arena_is_battle_live_participant(battle_id, auth.uid()))
  );
