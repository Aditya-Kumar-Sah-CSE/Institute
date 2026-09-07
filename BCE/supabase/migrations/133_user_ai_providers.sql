-- Migration 133: Per-User BYOK AI Agent Providers & Settings
CREATE TABLE IF NOT EXISTS public.user_ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('gemini', 'grok')),
  encrypted_api_key TEXT NOT NULL,
  key_mask VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.user_ai_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  active_provider VARCHAR(20) CHECK (active_provider IN ('gemini', 'grok')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own AI provider keys" ON public.user_ai_providers;
DROP POLICY IF EXISTS "Users can manage their own AI settings" ON public.user_ai_settings;

-- Create RLS Policies
CREATE POLICY "Users can manage their own AI provider keys" 
  ON public.user_ai_providers 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI settings" 
  ON public.user_ai_settings 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
