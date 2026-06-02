-- Fix admin_adjust_user_points function to use correct column names and data types

-- Drop the old function (may have multiple signatures)
DROP FUNCTION IF EXISTS admin_adjust_user_points(UUID, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_adjust_user_points(UUID, TEXT, NUMERIC, TEXT, TEXT);

-- Recreate with correct implementation
CREATE OR REPLACE FUNCTION admin_adjust_user_points(
  p_target_user_id UUID,
  p_adjustment_type TEXT,
  p_points NUMERIC,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance NUMERIC,
  points_change NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_actual_points_change NUMERIC;
  v_admin_user_id UUID;
BEGIN
  -- Get the admin user ID from auth context
  v_admin_user_id := auth.uid();
  
  -- Get current balance
  SELECT COALESCE(points_balance_after, 0) INTO v_current_balance
  FROM points_history
  WHERE user_id = p_target_user_id
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- If no history exists, start with 0
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;
  
  -- Calculate the actual points change based on adjustment type
  CASE p_adjustment_type
    WHEN 'add' THEN
      v_actual_points_change := p_points;
    WHEN 'subtract' THEN
      v_actual_points_change := -p_points;
    WHEN 'set' THEN
      v_actual_points_change := p_points - v_current_balance;
    ELSE
      RETURN QUERY SELECT FALSE, v_current_balance, 0::NUMERIC, 'Invalid adjustment type'::TEXT;
      RETURN;
  END CASE;
  
  v_new_balance := v_current_balance + v_actual_points_change;
  
  -- Don't allow negative balances
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 0::NUMERIC, 'Cannot reduce balance below zero'::TEXT;
    RETURN;
  END IF;
  
  -- Insert into points_history with correct column name
  INSERT INTO points_history (
    user_id,
    event_type,
    points_change,
    points_balance_after,
    notes,
    created_at
  ) VALUES (
    p_target_user_id,
    'admin_adjustment',
    v_actual_points_change,
    v_new_balance,
    COALESCE(p_notes, p_reason),
    NOW()
  );
  
  -- Log to admin audit table
  INSERT INTO points_admin_audit (
    admin_user_id,
    target_user_id,
    action_type,
    points_change,
    balance_before,
    balance_after,
    reason,
    notes,
    created_at
  ) VALUES (
    v_admin_user_id,
    p_target_user_id,
    p_adjustment_type,
    v_actual_points_change,
    v_current_balance,
    v_new_balance,
    p_reason,
    p_notes,
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_new_balance, v_actual_points_change, 'Points adjusted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;