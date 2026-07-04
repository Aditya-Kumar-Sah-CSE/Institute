-- Fix doubt likes count trigger by adding SECURITY DEFINER
-- This ensures the trigger runs with elevated privileges and bypasses RLS
-- when updating the likes_count on the doubts table, which regular users
-- might not have UPDATE permissions for.

CREATE OR REPLACE FUNCTION public.update_doubt_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.doubts SET likes_count = likes_count + 1 WHERE id = NEW.doubt_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.doubts SET likes_count = likes_count - 1 WHERE id = OLD.doubt_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
