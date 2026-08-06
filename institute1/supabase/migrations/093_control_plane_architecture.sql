-- =========================================================
-- 093: CONTROL PLANE ARCHITECTURE MIGRATION
-- =========================================================
-- Establishes a strict separation between Control Plane (Platform Users)
-- and Data Plane (Tenant Profiles).
--
-- 1. Dedicated platform_users table (linked to auth.users)
-- 2. profiles table remains 100% tenant-scoped
-- 3. RLS belongs_to_current_tenant() strictly checks institution_id equality
-- =========================================================

-- 1. Enum for Platform Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role_type') THEN
    CREATE TYPE public.platform_role_type AS ENUM (
      'SUPER_ADMIN',
      'PLATFORM_ADMIN',
      'SUPPORT',
      'BILLING_ADMIN'
    );
  END IF;
END $$;

-- 2. Dedicated platform_users table
CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role_type NOT NULL DEFAULT 'PLATFORM_ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for platform_users table
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_users' AND policyname = 'platform_users_self_read'
  ) THEN
    CREATE POLICY platform_users_self_read ON public.platform_users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- 3. Seed initial Super Admin into platform_users from profiles if role was super_admin
INSERT INTO public.platform_users (id, role)
SELECT p.id, 'SUPER_ADMIN'::public.platform_role_type
  FROM public.profiles p
 WHERE p.role = 'super_admin'
ON CONFLICT (id) DO UPDATE SET role = 'SUPER_ADMIN';

-- 4. Enforce STRICT Tenant RLS (NO platform admin bypass!)
-- Tenant APIs enforce institution_id equality.
-- Control Plane APIs use createAdminClient() service-role for cross-tenant operations.
CREATE OR REPLACE FUNCTION public.belongs_to_current_tenant(row_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_inst UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT institution_id INTO user_inst
    FROM public.profiles
   WHERE id = auth.uid();

  IF user_inst IS NULL OR row_institution_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Strictly check tenant equality. NEVER bypass RLS for platform users!
  RETURN user_inst = row_institution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
