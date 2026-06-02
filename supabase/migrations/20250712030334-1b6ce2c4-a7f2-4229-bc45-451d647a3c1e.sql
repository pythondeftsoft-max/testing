-- Create table to track property limit notifications to prevent duplicates
CREATE TABLE public.property_limit_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'approaching_limit', 'at_limit', 'over_limit'
  property_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, property_count)
);

-- Enable Row Level Security
ALTER TABLE public.property_limit_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notification tracking" 
ON public.property_limit_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.property_limit_notifications 
FOR INSERT 
WITH CHECK (true);

-- Enhanced function to check property limits and send notifications
CREATE OR REPLACE FUNCTION public.check_property_limit_with_notifications(landlord_id uuid)
RETURNS TABLE(
  current_properties integer, 
  free_tier_limit integer, 
  billable_units integer, 
  has_active_subscription boolean, 
  needs_subscription boolean,
  notification_sent boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  billable INTEGER;
  has_subscription BOOLEAN;
  free_limit INTEGER := 10;
  notification_sent_result BOOLEAN := false;
  subscription_link TEXT := '/landlord-hap';
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
  
  -- Send notifications based on property count (only if no subscription)
  IF NOT has_subscription THEN
    -- At exactly 10 properties - reached free tier limit
    IF current_count = free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count)
      VALUES (landlord_id, 'at_limit', current_count)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      -- Check if notification was actually inserted (not a duplicate)
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_id,
          'Free Tier Limit Reached!',
          'You''ve reached your free tier limit of ' || free_limit || ' properties. Subscribe to Landlord Pro to add unlimited properties and unlock premium features.',
          'warning',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
    
    -- At 8 properties - approaching limit warning
    IF current_count = 8 THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count)
      VALUES (landlord_id, 'approaching_limit', current_count)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_id,
          'Approaching Property Limit',
          'You have ' || (free_limit - current_count) || ' properties remaining in your free tier. Consider upgrading to Landlord Pro for unlimited properties.',
          'info',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
    
    -- Over limit - needs subscription
    IF current_count > free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count)
      VALUES (landlord_id, 'over_limit', current_count)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_id,
          'Subscription Required',
          'You have ' || current_count || ' properties, which exceeds your free tier limit of ' || free_limit || '. Subscribe now to continue managing your properties.',
          'error',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    current_count,
    free_limit,
    billable,
    has_subscription,
    (billable > 0 AND NOT has_subscription) as needs_subscription,
    notification_sent_result;
END;
$$;

-- Create trigger to automatically check limits when properties are added
CREATE OR REPLACE FUNCTION public.handle_property_limit_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run on INSERT and when property is not deleted
  IF TG_OP = 'INSERT' AND (NEW.deleted_at IS NULL) THEN
    -- Check limits and potentially send notifications
    PERFORM public.check_property_limit_with_notifications(NEW.owner_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_check_property_limits ON public.properties;
CREATE TRIGGER trigger_check_property_limits
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_property_limit_check();