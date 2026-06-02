-- Update property limit notifications to use specific types instead of generic ones
-- This allows us to identify and handle them differently in the frontend

-- Update existing notifications
UPDATE public.notifications 
SET type = 'property_limit_warning'
WHERE title = 'Free Tier Limit Reached!' 
  AND description LIKE '%reached your free tier limit%';

UPDATE public.notifications 
SET type = 'property_limit_info'
WHERE title = 'Approaching Property Limit' 
  AND description LIKE '%Approaching Property Limit%';

UPDATE public.notifications 
SET type = 'property_limit_error'
WHERE title = 'Subscription Required' 
  AND description LIKE '%exceeds your free tier limit%';

-- Update the check_property_limit_with_notifications function to use new types
CREATE OR REPLACE FUNCTION public.check_property_limit_with_notifications(landlord_id uuid)
 RETURNS TABLE(current_properties integer, free_tier_limit integer, billable_units integer, has_active_subscription boolean, needs_subscription boolean, notification_sent boolean)
 LANGUAGE plpgsql
 VOLATILE
AS $function$
DECLARE
  current_count INT;
  free_limit INT := 10;
  has_subscription BOOLEAN;
  needs_sub BOOLEAN;
  subscription_link TEXT := '/landlord-hap';
  billable_units_count INT;
  notification_sent_result BOOLEAN := false;
BEGIN
  -- Get current property count for this landlord
  SELECT COUNT(*) INTO current_count
  FROM public.properties
  WHERE owner_id = landlord_id AND deleted = false;

  -- Check if landlord has an active subscription
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = landlord_id
      AND status IN ('active', 'trialing')
      AND role = 'landlord'
  ) INTO has_subscription;

  -- Calculate billable units (properties over free tier limit)
  billable_units_count := GREATEST(0, current_count - free_limit);

  -- Determine if subscription is needed (over limit and no subscription)
  needs_sub := current_count > free_limit AND NOT has_subscription;
  
  -- Send notifications based on property count (only if no subscription)
  IF NOT has_subscription THEN
    -- At exactly 10 properties - reached free tier limit
    IF current_count = free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count)
      VALUES (landlord_id, 'at_limit', current_count)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_id,
          'Free Tier Limit Reached!',
          'You''ve reached your free tier limit of ' || free_limit || ' properties. Subscribe to Landlord Pro to add unlimited properties and unlock premium features.',
          'property_limit_warning',
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
          'property_limit_info',
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
          'property_limit_error',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    current_count,
    free_limit,
    billable_units_count,
    has_subscription,
    needs_sub,
    notification_sent_result;
END;
$function$;

-- Update check_portfolio_property_limit_with_notifications to use new types
CREATE OR REPLACE FUNCTION public.check_portfolio_property_limit_with_notifications(
  landlord_id text,
  portfolio_id_param text
)
 RETURNS TABLE(current_properties integer, free_tier_limit integer, billable_units integer, has_active_subscription boolean, needs_subscription boolean, notification_sent boolean)
 LANGUAGE plpgsql
 VOLATILE
AS $function$
DECLARE
  current_count INT;
  free_limit INT := 10;
  has_subscription BOOLEAN;
  needs_sub BOOLEAN;
  subscription_link TEXT := '/landlord-hap';
  billable_units_count INT;
  notification_sent_result BOOLEAN := false;
  landlord_uuid UUID;
BEGIN
  -- Convert text UUID to UUID type
  landlord_uuid := landlord_id::UUID;

  -- Get current property count for this portfolio
  SELECT COUNT(*) INTO current_count
  FROM public.properties p
  WHERE p.owner_id = landlord_uuid 
    AND p.deleted = false
    AND p.portfolio_id::text = portfolio_id_param;

  -- Check if landlord has an active subscription
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = landlord_uuid
      AND status IN ('active', 'trialing')
      AND role = 'landlord'
  ) INTO has_subscription;

  -- Calculate billable units (properties over free tier limit)
  billable_units_count := GREATEST(0, current_count - free_limit);

  -- Determine if subscription is needed (over limit and no subscription)
  needs_sub := current_count > free_limit AND NOT has_subscription;
  
  -- Send notifications based on property count (only if no subscription)
  IF NOT has_subscription THEN
    -- At exactly 10 properties - reached free tier limit
    IF current_count = free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id)
      VALUES (landlord_uuid, 'at_limit', current_count, portfolio_id_param::UUID)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_uuid,
          'Free Tier Limit Reached!',
          'You''ve reached your free tier limit of ' || free_limit || ' properties in this portfolio. Subscribe to Landlord Pro to add unlimited properties and unlock premium features.',
          'property_limit_warning',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
    
    -- At 8 properties - approaching limit warning
    IF current_count = 8 THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id)
      VALUES (landlord_uuid, 'approaching_limit', current_count, portfolio_id_param::UUID)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_uuid,
          'Approaching Property Limit',
          'You have ' || (free_limit - current_count) || ' properties remaining in your free tier for this portfolio. Consider upgrading to Landlord Pro for unlimited properties.',
          'property_limit_info',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
    
    -- Over limit - needs subscription
    IF current_count > free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id)
      VALUES (landlord_uuid, 'over_limit', current_count, portfolio_id_param::UUID)
      ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, description, type, link)
        VALUES (
          landlord_uuid,
          'Subscription Required',
          'You have ' || current_count || ' properties in this portfolio, which exceeds your free tier limit of ' || free_limit || '. Subscribe now to continue managing your properties.',
          'property_limit_error',
          subscription_link
        );
        notification_sent_result := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    current_count,
    free_limit,
    billable_units_count,
    has_subscription,
    needs_sub,
    notification_sent_result;
END;
$function$;