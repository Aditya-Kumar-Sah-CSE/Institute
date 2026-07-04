CREATE OR REPLACE FUNCTION get_and_award_last_month_winners()
RETURNS VOID AS $$
DECLARE
  v_target_month DATE;
  v_winners_exist BOOLEAN;
BEGIN
  -- We use date_trunc('month', NOW() - INTERVAL '1 month') because the crown awarded
  -- on the 1st of the month represents the winner for the PREVIOUS month (e.g. awarded July 1st for June).
  v_target_month := date_trunc('month', NOW() - INTERVAL '1 month')::DATE;

  -- Check if winners for this month are already computed
  SELECT EXISTS (
    SELECT 1 FROM monthly_rewards WHERE month_date = v_target_month
  ) INTO v_winners_exist;

  -- If not computed, compute and insert top 10 from the global leaderboard (profiles table)
  IF NOT v_winners_exist THEN
    INSERT INTO monthly_rewards (user_id, month_date, rank)
    SELECT 
      id as user_id,
      v_target_month,
      row_number() OVER (ORDER BY xp DESC) as rank
    FROM profiles
    WHERE role = 'student'
      AND email != 'iambestadi@gmail.com'
      AND xp > 0
    ORDER BY xp DESC
    LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear any previously computed rewards (like the wrong July ones) so they recalculate for June
DELETE FROM monthly_rewards;
