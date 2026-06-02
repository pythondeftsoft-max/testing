-- Add subscription units tracking and property counting functions
ALTER TABLE public.subscriptions 
ADD COLUMN subscription_units INTEGER DEFAULT 0,
ADD COLUMN free_tier_limit INTEGER DEFAULT 10;

-- Function to count active properties for a landlord
CREATE OR REPLACE FUNCTION public.count_landlord_properties(landlord_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.properties 
  WHERE owner_id = landlord_id 
    AND deleted_at IS NULL 
    AND status != 'deleted';
$$;

-- Function to calculate billable units (properties over free tier)
CREATE OR REPLACE FUNCTION public.calculate_billable_units(landlord_id UUID, free_tier INTEGER DEFAULT 10)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER  
AS $$
  SELECT GREATEST(0, count_landlord_properties(landlord_id) - free_tier);
$$;

-- Function to check if landlord needs subscription for property limit
CREATE OR REPLACE FUNCTION public.check_property_limit_exceeded(landlord_id UUID)
RETURNS TABLE(
  current_properties INTEGER,
  free_tier_limit INTEGER,
  billable_units INTEGER,
  has_active_subscription BOOLEAN,
  needs_subscription BOOLEAN
)
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  billable INTEGER;
  has_subscription BOOLEAN;
  free_limit INTEGER := 10;
BEGIN
  -- Get current property count
  SELECT count_landlord_properties(landlord_id) INTO current_count;
  
  -- Calculate billable units
  SELECT calculate_billable_units(landlord_id, free_limit) INTO billable;
  
  -- Check for active subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = landlord_id 
      AND role = 'landlord' 
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO has_subscription;
  
  RETURN QUERY SELECT 
    current_count,
    free_limit,
    billable,
    has_subscription,
    (billable > 0 AND NOT has_subscription) as needs_subscription;
END;
$$;