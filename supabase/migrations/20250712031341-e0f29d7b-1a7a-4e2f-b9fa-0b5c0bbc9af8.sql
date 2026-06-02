-- Fix the check_property_limit_with_notifications function to be VOLATILE instead of STABLE
-- This allows INSERT operations which are needed for creating notifications

CREATE OR REPLACE FUNCTION public.check_property_limit_with_notifications(landlord_id uuid)
 RETURNS TABLE(current_properties integer, free_tier_limit integer, billable_units integer, has_active_subscription boolean, needs_subscription boolean, notification_sent boolean)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER  -- Changed from STABLE to VOLATILE to allow INSERT operations
AS $function$
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
$function$;