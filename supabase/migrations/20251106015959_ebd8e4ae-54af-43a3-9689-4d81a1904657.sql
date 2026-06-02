-- Function to get subscriptions with latest payment info
CREATE OR REPLACE FUNCTION get_admin_subscriptions_with_payments()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan_type text,
  role text,
  current_period_end timestamptz,
  created_at timestamptz,
  subscription_units int,
  autopay_enabled boolean,
  last_payment_amount numeric,
  last_payment_date timestamptz,
  user_first_name text,
  user_last_name text,
  user_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.status,
    s.plan_type,
    s.role,
    s.current_period_end,
    s.created_at,
    s.subscription_units,
    s.autopay_enabled,
    latest_tx.amount as last_payment_amount,
    latest_tx.processed_at as last_payment_date,
    p.first_name as user_first_name,
    p.last_name as user_last_name,
    p.user_type
  FROM subscriptions s
  INNER JOIN profiles p ON s.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT t.amount, t.processed_at
    FROM subscription_autopay_schedules sas
    JOIN subscription_autopay_transactions t ON t.autopay_schedule_id = sas.id
    WHERE sas.subscription_id = s.id 
      AND t.status = 'succeeded'
      AND t.processed_at IS NOT NULL
    ORDER BY t.processed_at DESC
    LIMIT 1
  ) latest_tx ON true
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;