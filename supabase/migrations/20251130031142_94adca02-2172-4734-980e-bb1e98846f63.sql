-- Create function to clear all Stripe customer IDs from profiles
-- This is needed when migrating from Stripe TEST mode to LIVE mode
CREATE OR REPLACE FUNCTION clear_all_stripe_customers()
RETURNS TABLE(cleared_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_cleared bigint;
BEGIN
  -- Update all profiles that have a stripe_customer_id
  UPDATE profiles 
  SET 
    stripe_customer_id = NULL,
    updated_at = now()
  WHERE stripe_customer_id IS NOT NULL;
  
  -- Get the count of rows updated
  GET DIAGNOSTICS count_cleared = ROW_COUNT;
  
  RETURN QUERY SELECT count_cleared;
END;
$$;

-- Execute the function to clear all TEST mode customer IDs
SELECT clear_all_stripe_customers();