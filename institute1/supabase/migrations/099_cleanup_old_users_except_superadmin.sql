-- Migration 099: Permanently delete all old user data except super admin (iambestadi@gmail.com)

DO $$
DECLARE
  super_admin_email TEXT := 'iambestadi@gmail.com';
  super_admin_id UUID;
BEGIN
  -- Find the Super Admin UUID from profiles or auth.users
  SELECT id INTO super_admin_id FROM profiles WHERE LOWER(email) = LOWER(super_admin_email) LIMIT 1;

  IF super_admin_id IS NULL THEN
    SELECT id INTO super_admin_id FROM auth.users WHERE LOWER(email) = LOWER(super_admin_email) LIMIT 1;
  END IF;

  IF super_admin_id IS NOT NULL THEN
    RAISE NOTICE 'Preserving Super Admin User ID: % (%)', super_admin_id, super_admin_email;

    -- Delete all non-admin submissions
    DELETE FROM submissions WHERE user_id != super_admin_id;

    -- Delete all non-admin code arena submissions
    DELETE FROM code_arena_submissions WHERE user_id != super_admin_id;

    -- Delete all non-admin contest registrations
    DELETE FROM contest_registrations WHERE user_id != super_admin_id;

    -- Delete all non-admin enrollments
    DELETE FROM enrollments WHERE user_id != super_admin_id;

    -- Delete all non-admin certificates
    DELETE FROM certificates WHERE user_id != super_admin_id;

    -- Delete all non-admin user badges
    DELETE FROM user_badges WHERE user_id != super_admin_id;

    -- Delete all non-admin doubt likes & replies
    DELETE FROM doubt_likes WHERE user_id != super_admin_id;
    DELETE FROM doubt_replies WHERE user_id != super_admin_id;
    DELETE FROM doubts WHERE user_id != super_admin_id;

    -- Delete all non-admin chat members & messages
    DELETE FROM chat_messages WHERE sender_id != super_admin_id;
    DELETE FROM chat_members WHERE user_id != super_admin_id;

    -- Delete all non-admin feedbacks
    DELETE FROM feedbacks WHERE user_id != super_admin_id;

    -- Delete all non-admin notifications
    DELETE FROM notifications WHERE user_id != super_admin_id;

    -- Delete all non-admin profiles (except super admin)
    DELETE FROM profiles WHERE id != super_admin_id;

    -- Delete non-admin auth.users if permissions allow
    BEGIN
      DELETE FROM auth.users WHERE id != super_admin_id AND LOWER(email) != LOWER(super_admin_email);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Direct deletion from auth.users skipped due to engine permissions. Profiles and user data cleaned up.';
    END;

    RAISE NOTICE 'Old user cleanup completed successfully. Only % preserved.', super_admin_email;
  ELSE
    RAISE WARNING 'Super Admin email % not found in database. Deletion aborted to prevent total data wipeout.', super_admin_email;
  END IF;
END $$;
