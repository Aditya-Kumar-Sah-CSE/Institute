CREATE OR REPLACE FUNCTION get_and_award_last_month_winners()
RETURNS VOID AS $$
DECLARE
  v_target_month DATE;
  v_winners_exist BOOLEAN;
BEGIN
  -- Determine the first day of the previous month
  v_target_month := date_trunc('month', NOW() - INTERVAL '1 month')::DATE;

  -- Check if winners for this month are already computed
  SELECT EXISTS (
    SELECT 1 FROM monthly_rewards WHERE month_date = v_target_month
  ) INTO v_winners_exist;

  -- If not computed, compute and insert top 10
  IF NOT v_winners_exist THEN
    INSERT INTO monthly_rewards (user_id, month_date, rank)
    SELECT 
      x.user_id,
      v_target_month,
      row_number() OVER (ORDER BY SUM(x.xp_amount) DESC) as rank
    FROM xp_log x
    JOIN profiles p ON x.user_id = p.id
    WHERE x.created_at >= v_target_month
      AND x.created_at < v_target_month + INTERVAL '1 month'
      AND p.role = 'student'
      AND p.email != 'iambestadi@gmail.com'
    GROUP BY x.user_id
    HAVING SUM(x.xp_amount) > 0
    ORDER BY SUM(x.xp_amount) DESC
    LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear recent wrongly computed rewards so they recalculate correctly
DELETE FROM monthly_rewards WHERE month_date = date_trunc('month', NOW() - INTERVAL '1 month')::DATE;
