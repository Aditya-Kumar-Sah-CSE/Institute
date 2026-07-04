-- Create monthly_rewards table
CREATE TABLE IF NOT EXISTS monthly_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month_date DATE NOT NULL,
  rank INTEGER NOT NULL,
  is_seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_date)
);

ALTER TABLE monthly_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own monthly rewards" ON monthly_rewards FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins manage monthly rewards" ON monthly_rewards FOR ALL USING (is_admin());

-- Function to dynamically compute top 10 XP gainers for the previous month
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
      user_id,
      v_target_month,
      row_number() OVER (ORDER BY SUM(xp_amount) DESC) as rank
    FROM xp_log
    WHERE created_at >= v_target_month
      AND created_at < v_target_month + INTERVAL '1 month'
    GROUP BY user_id
    HAVING SUM(xp_amount) > 0
    ORDER BY SUM(xp_amount) DESC
    LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
