-- Migration 134: Add 'groq' to user_ai_providers and user_ai_settings check constraints

ALTER TABLE public.user_ai_providers 
  DROP CONSTRAINT IF EXISTS user_ai_providers_provider_check;

ALTER TABLE public.user_ai_providers 
  ADD CONSTRAINT user_ai_providers_provider_check 
  CHECK (provider IN ('gemini', 'grok', 'groq'));

ALTER TABLE public.user_ai_settings 
  DROP CONSTRAINT IF EXISTS user_ai_settings_active_provider_check;

ALTER TABLE public.user_ai_settings 
  ADD CONSTRAINT user_ai_settings_active_provider_check 
  CHECK (active_provider IN ('gemini', 'grok', 'groq'));
