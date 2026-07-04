-- ==========================================
-- NOTIFICATION SYSTEM TRIGGERS
-- ==========================================

-- 1. Trigger for New Doubt Replies
CREATE OR REPLACE FUNCTION notify_on_doubt_reply()
RETURNS trigger AS $$
DECLARE
    v_doubt_author UUID;
    v_replier_name TEXT;
    v_doubt_title TEXT;
BEGIN
    -- Get the author of the doubt and the doubt title
    SELECT user_id, title INTO v_doubt_author, v_doubt_title
    FROM public.doubts WHERE id = NEW.doubt_id;

    -- Don't notify if the user replied to their own doubt
    IF v_doubt_author != NEW.user_id THEN
        -- Get replier name
        SELECT name INTO v_replier_name FROM public.profiles WHERE id = NEW.user_id;

        INSERT INTO public.notifications (user_id, type, message, link)
        VALUES (
            v_doubt_author,
            'reply',
            v_replier_name || ' replied to your doubt: "' || substring(v_doubt_title from 1 for 30) || '..."',
            '/doubts/' || NEW.doubt_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_doubt_reply ON public.doubt_replies;
CREATE TRIGGER trigger_notify_on_doubt_reply
    AFTER INSERT ON public.doubt_replies
    FOR EACH ROW EXECUTE PROCEDURE notify_on_doubt_reply();


-- 2. Trigger for Doubt Likes
CREATE OR REPLACE FUNCTION notify_on_doubt_like()
RETURNS trigger AS $$
DECLARE
    v_doubt_author UUID;
    v_liker_name TEXT;
    v_doubt_title TEXT;
BEGIN
    SELECT user_id, title INTO v_doubt_author, v_doubt_title
    FROM public.doubts WHERE id = NEW.doubt_id;

    IF v_doubt_author != NEW.user_id THEN
        SELECT name INTO v_liker_name FROM public.profiles WHERE id = NEW.user_id;

        INSERT INTO public.notifications (user_id, type, message, link)
        VALUES (
            v_doubt_author,
            'upvote',
            v_liker_name || ' liked your doubt: "' || substring(v_doubt_title from 1 for 30) || '..."',
            '/doubts/' || NEW.doubt_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_doubt_like ON public.doubt_likes;
CREATE TRIGGER trigger_notify_on_doubt_like
    AFTER INSERT ON public.doubt_likes
    FOR EACH ROW EXECUTE PROCEDURE notify_on_doubt_like();


-- 3. Trigger for Reply Upvotes (from reply_votes)
CREATE OR REPLACE FUNCTION notify_on_reply_upvote()
RETURNS trigger AS $$
DECLARE
    v_reply_author UUID;
    v_voter_name TEXT;
    v_doubt_id UUID;
BEGIN
    -- Only notify on upvote
    IF NEW.vote_type = 'upvote' THEN
        SELECT user_id, doubt_id INTO v_reply_author, v_doubt_id
        FROM public.doubt_replies WHERE id = NEW.reply_id;

        IF v_reply_author != NEW.user_id THEN
            SELECT name INTO v_voter_name FROM public.profiles WHERE id = NEW.user_id;

            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (
                v_reply_author,
                'upvote',
                v_voter_name || ' upvoted your reply!',
                '/doubts/' || v_doubt_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_reply_upvote ON public.reply_votes;
CREATE TRIGGER trigger_notify_on_reply_upvote
    AFTER INSERT ON public.reply_votes
    FOR EACH ROW EXECUTE PROCEDURE notify_on_reply_upvote();


-- 4. Trigger for Global Notices
CREATE OR REPLACE FUNCTION notify_on_new_notice()
RETURNS trigger AS $$
DECLARE
    v_author_name TEXT;
BEGIN
    SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;

    -- Insert a notification for every student
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT id, 'notice', v_author_name || ' posted a new notice: ' || NEW.title, '/notices'
    FROM public.profiles
    WHERE role = 'student';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_notice ON public.notices;
CREATE TRIGGER trigger_notify_on_new_notice
    AFTER INSERT ON public.notices
    FOR EACH ROW EXECUTE PROCEDURE notify_on_new_notice();
