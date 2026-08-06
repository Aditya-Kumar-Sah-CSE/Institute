-- =========================================================
-- 094: ENTERPRISE PRODUCTION READY ARCHITECTURE ENHANCEMENTS
-- =========================================================
-- 1. Enhances platform_users with lifecycle fields (status, is_active, last_login_at, created_by)
-- 2. Enhances institutions with lifecycle fields (subscription_status, plan_id, trial_ends_at, suspended_at, deleted_at)
-- 3. Dedicated platform_sessions table for auditing support impersonations
-- 4. Feature flags tables: platform_features and tenant_features
-- 5. Separated Audit Logs: platform_audit_logs and tenant_audit_logs
-- =========================================================

-- 1. Enhance platform_users schema
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Enhance institutions schema with lifecycle fields
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_id UUID,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Dedicated platform_sessions table for Audited Impersonation
CREATE TABLE IF NOT EXISTS public.platform_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  ip_address VARCHAR(100)
);

ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_sessions' AND policyname = 'platform_sessions_self_read') THEN
    CREATE POLICY platform_sessions_self_read ON public.platform_sessions
      FOR SELECT USING (auth.uid() = platform_user_id);
  END IF;
END $$;

-- 4. Feature Flags Tables
CREATE TABLE IF NOT EXISTS public.platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_enabled_globally BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, feature_key)
);

ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- 5. Separated Audit Logs
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_resource VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_resource VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;
