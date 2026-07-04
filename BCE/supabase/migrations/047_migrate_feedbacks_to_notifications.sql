-- ==========================================
-- MIGRATE FEEDBACKS TO NOTIFICATIONS
-- ==========================================

-- 1. Insert old notifications from feedbacks into the notifications table
INSERT INTO public.notifications (user_id, type, message, link, is_read, created_at)
SELECT 
    user_id,
    'system', -- using 'system' for generic alerts
    message,
    '#',      -- fallback link since feedbacks didn't have specific links
    CASE WHEN status = 'resolved' THEN true ELSE false END,
    created_at
FROM public.feedbacks
WHERE category = 'Notification' 
  AND user_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = feedbacks.user_id);

-- 2. Delete the migrated rows from feedbacks to clean up
DELETE FROM public.feedbacks WHERE category = 'Notification';
