-- Add xp_log to realtime publication so we can listen to it from the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE xp_log;
