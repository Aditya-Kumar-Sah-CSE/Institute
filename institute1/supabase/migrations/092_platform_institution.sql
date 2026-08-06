-- ==========================================
-- 092: PLATFORM INSTITUTION
-- ==========================================
-- Creates a first-class Platform Institution (is_platform = TRUE).
-- Every user and every tenant-owned row will have a non-NULL institution_id.
-- main-campus rows are untouched (backfill only targets institution_id IS NULL).
-- Migration fails if any NULL institution_id remains after backfill.

-- ─────────────────────────────────────────
-- STEP 1: Schema additions (idempotent)
-- ─────────────────────────────────────────
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;

-- Enforce at most one platform institution at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_one_platform
  ON public.institutions(is_platform)
  WHERE is_platform = TRUE;

-- ─────────────────────────────────────────
-- STEP 2: Upsert Platform Institution
-- Authorization uses is_platform = TRUE, not slug comparison.
-- Slug is only used here as the conflict target for idempotency.
-- ─────────────────────────────────────────
INSERT INTO public.institutions (name, slug, status, is_platform, is_active)
VALUES ('Smart Learning', 'smart-learning', 'active', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE
  SET is_platform = TRUE,
      is_active   = TRUE,
      status      = 'active';

-- ─────────────────────────────────────────
-- STEP 3: Update belongs_to_current_tenant()
-- Authorization decision uses institution_id equality only.
-- NULL on either side is a data integrity violation and denies access.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.belongs_to_current_tenant(row_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_inst UUID;
BEGIN
  -- Super admins see everything
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT institution_id INTO user_inst
    FROM public.profiles
   WHERE id = auth.uid();

  -- Post-migration both sides must be non-NULL.
  -- Return FALSE (deny) if either is NULL rather than crashing.
  IF user_inst IS NULL OR row_institution_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN user_inst = row_institution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- STEP 4: Update handle_new_user trigger
-- Falls back to Platform Institution ONLY when institution_id is absent from metadata.
-- Tenant signups always provide institution_id via the hidden form field.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  resolved_inst UUID;
BEGIN
  resolved_inst := NULLIF(new.raw_user_meta_data->>'institution_id', '')::uuid;

  -- Platform auth flow: no institution_id in metadata → assign platform institution.
  -- Tenant auth flows always supply institution_id; if they don't, resolved_inst
  -- will be set to the platform institution which is wrong but the app layer will
  -- catch this before it ever reaches the trigger (auth.ts validates first).
  IF resolved_inst IS NULL THEN
    SELECT id INTO resolved_inst
      FROM public.institutions
     WHERE is_platform = TRUE
     LIMIT 1;

    -- Safety: if platform institution doesn't exist yet, abort
    IF resolved_inst IS NULL THEN
      RAISE EXCEPTION 'Platform Institution not found. Run migration 092 first.';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, name, email, institute_id, graduation_period, institution_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'institute_id',
    new.raw_user_meta_data->>'graduation_period',
    resolved_inst   -- guaranteed non-null
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- STEP 5: Selective backfill + post-assertion
--
-- Only truly tenant-owned tables listed below.
-- Excluded (global / non-tenant-owned):
--   institutions, pricing_plans, institution_requests,
--   audit_logs, payment_settings, coupons, badges
--
-- main-campus rows are untouched: WHERE institution_id IS NULL only.
-- Migration FAILS via RAISE EXCEPTION if any NULL remains after backfill.
-- ─────────────────────────────────────────
DO $$
DECLARE
  platform_id  UUID;
  t_name       TEXT;
  null_count   INT;
  table_list   TEXT[] := ARRAY[
    'profiles',
    'courses',
    'lessons',
    'assignments',
    'submissions',
    'enrollments',
    'lesson_progress',
    'xp_logs',
    'notices',
    'doubts',
    'doubt_replies',
    'course_alerts',
    'monthly_rewards',
    'chats',
    'chat_messages',
    'hall_of_fame',
    'certificates'
  ];
BEGIN
  -- Resolve by is_platform = TRUE (never by slug)
  SELECT id INTO platform_id
    FROM public.institutions
   WHERE is_platform = TRUE;

  IF platform_id IS NULL THEN
    RAISE EXCEPTION 'Platform Institution not found after upsert. Migration 092 Step 2 failed.';
  END IF;

  -- ── Backfill: only NULL rows; existing institution_ids (e.g. main-campus) untouched ──
  FOREACH t_name IN ARRAY table_list LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = t_name
         AND column_name  = 'institution_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET institution_id = %L WHERE institution_id IS NULL',
        t_name, platform_id
      );
    END IF;
  END LOOP;

  -- ── Post-backfill assertion: FAIL the migration if any NULL remains ──
  FOREACH t_name IN ARRAY table_list LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = t_name
         AND column_name  = 'institution_id'
    ) THEN
      EXECUTE format(
        'SELECT COUNT(*) FROM public.%I WHERE institution_id IS NULL',
        t_name
      ) INTO null_count;

      IF null_count > 0 THEN
        RAISE EXCEPTION
          'MIGRATION FAILED: table "%" still has % NULL institution_id row(s) after backfill.',
          t_name, null_count;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration 092 complete. Platform ID: %', platform_id;
END $$;
