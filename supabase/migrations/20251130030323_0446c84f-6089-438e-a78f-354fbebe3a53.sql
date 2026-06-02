-- Create function to clear Stripe checkout session data from placement fees
-- This is needed when regenerating payment links (e.g., switching from test to live mode)
CREATE OR REPLACE FUNCTION clear_placement_fee_checkout(fee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE landlord_placement_fees 
  SET 
    stripe_checkout_url = NULL,
    stripe_session_id = NULL,
    stripe_checkout_created_at = NULL,
    updated_at = now()
  WHERE id = fee_id;
END;
$$;