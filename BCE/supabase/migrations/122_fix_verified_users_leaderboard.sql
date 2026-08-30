-- Migration 122: Fix Verified Users Leaderboard & Cleanup Unverified Accounts

-- 1. Add verification and login tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Backfill existing profiles from auth.users
UPDATE public.profiles p
SET 
  is_verified = (u.email_confirmed_at IS NOT NULL),
  last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id;

-- Ensure legitimate existing active users are verified
UPDATE public.profiles p
SET is_verified = true
WHERE p.is_verified = false AND (p.last_active_at IS NOT NULL OR p.xp > 0);

-- 3. Function and trigger to sync updates from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_verified = (NEW.email_confirmed_at IS NOT NULL),
    last_login_at = COALESCE(NEW.last_sign_in_at, last_login_at)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_update();

-- 4. Update handle_new_user() trigger for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_verified, last_login_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Student'), 
    new.email,
    (new.email_confirmed_at IS NOT NULL),
    new.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_verified = EXCLUDED.is_verified,
    last_login_at = EXCLUDED.last_login_at;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create SQL function for 48-hour unverified user cleanup
CREATE OR REPLACE FUNCTION public.cleanup_pending_unverified_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH target_users AS (
    SELECT id FROM auth.users
    WHERE created_at < NOW() - INTERVAL '48 hours'
      AND (email_confirmed_at IS NULL OR last_sign_in_at IS NULL)
  )
  DELETE FROM auth.users
  WHERE id IN (SELECT id FROM target_users);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
