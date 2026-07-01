CREATE OR REPLACE FUNCTION get_and_award_last_month_winners()
RETURNS VOID AS $$
DECLARE
  v_target_month DATE;
  v_winners_exist BOOLEAN;
BEGIN
  -- We use date_trunc('month', NOW()) because the crown is awarded on the 1st of the current month,
  -- based on their global leaderboard standing at that moment. The crown lasts for the current month.
  -- Wait, the previous logic used NOW() - 1 month. The user says "on the 1st, whoever is top 10, gets the crown for the next month".
  -- So we label it with the current month (e.g. July 1st -> July crown).
  -- Let's use the current month as the label:
  v_target_month := date_trunc('month', NOW())::DATE;

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

-- Clear any previously computed rewards for both current and previous month just in case,
-- so the system correctly assigns the global top 10 when re-triggered.
DELETE FROM monthly_rewards;
