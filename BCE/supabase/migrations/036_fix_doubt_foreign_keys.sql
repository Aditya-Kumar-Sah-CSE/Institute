-- Change foreign keys from auth.users to public.profiles

ALTER TABLE public.doubts
DROP CONSTRAINT IF EXISTS doubts_user_id_fkey,
ADD CONSTRAINT doubts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.doubt_replies
DROP CONSTRAINT IF EXISTS doubt_replies_user_id_fkey,
ADD CONSTRAINT doubt_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
