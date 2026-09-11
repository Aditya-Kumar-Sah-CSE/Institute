-- Migration 134: Ensure 'groq' is included in user_ai_providers and user_ai_settings check constraints for existing tables

DO $$ 
BEGIN
  -- 1. Update user_ai_providers check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_ai_providers_provider_check'
  ) THEN
    ALTER TABLE public.user_ai_providers DROP CONSTRAINT user_ai_providers_provider_check;
  END IF;

  ALTER TABLE public.user_ai_providers 
    ADD CONSTRAINT user_ai_providers_provider_check 
    CHECK (provider IN ('gemini', 'grok', 'groq'));

  -- 2. Update user_ai_settings check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_ai_settings_active_provider_check'
  ) THEN
    ALTER TABLE public.user_ai_settings DROP CONSTRAINT user_ai_settings_active_provider_check;
  END IF;

  ALTER TABLE public.user_ai_settings 
    ADD CONSTRAINT user_ai_settings_active_provider_check 
    CHECK (active_provider IN ('gemini', 'grok', 'groq'));
END $$;
