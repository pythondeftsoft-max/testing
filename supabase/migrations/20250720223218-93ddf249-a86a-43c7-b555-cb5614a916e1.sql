-- Phase 1.1 Continued: Fix remaining Function Search Path Mutable warnings
-- Adding SET search_path = '' to all remaining database functions for security

-- Update remaining critical functions with search_path security

-- Update reset_monthly_applications function
CREATE OR REPLACE FUNCTION public.reset_monthly_applications()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  UPDATE public.tenant_profiles 
  SET applications_this_month = 0,
      last_application_reset = CURRENT_DATE
  WHERE last_application_reset < CURRENT_DATE - INTERVAL '1 month';
END;
$$;

-- Update geocode_property_address function
CREATE OR REPLACE FUNCTION public.geocode_property_address(property_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  property_address text;
BEGIN
  -- Get full address for the property
  SELECT CONCAT_WS(', ', street_address, city, state, zipcode)
  INTO property_address
  FROM public.properties 
  WHERE id = property_id;
  
  -- Note: This function sets up the structure
  -- The actual geocoding will be handled by an edge function
  -- to avoid making external API calls directly from the database
  
  -- Log the geocoding request
  INSERT INTO public.notifications (user_id, title, description, type)
  SELECT 
    owner_id,
    'Property Geocoding',
    'Geocoding requested for property at: ' || property_address,
    'info'
  FROM public.properties 
  WHERE id = property_id;
END;
$$;

-- Update trigger_geocode_new_property function
CREATE OR REPLACE FUNCTION public.trigger_geocode_new_property()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  -- Only trigger if address fields are present and coordinates are missing
  IF (NEW.street_address IS NOT NULL OR NEW.city IS NOT NULL) 
     AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    
    -- Call the geocoding function
    PERFORM public.geocode_property_address(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_application_approval function
CREATE OR REPLACE FUNCTION public.handle_application_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  -- If an application is being approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Reject all other pending applications for this tenant
    UPDATE public.property_applications 
    SET status = 'rejected', 
        updated_at = now()
    WHERE tenant_id = NEW.tenant_id 
    AND id != NEW.id 
    AND status = 'pending';
    
    -- Update property status to occupied when application is approved
    UPDATE public.properties
    SET status = 'occupied',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_tenant_request_status function
CREATE OR REPLACE FUNCTION public.handle_tenant_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  -- When a tenant request is created, set property status to available
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.properties
    SET status = 'available',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update moderate_message_content function
CREATE OR REPLACE FUNCTION public.moderate_message_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
DECLARE
  v_flagged_words TEXT[] := ARRAY['spam', 'scam', 'urgent', 'money transfer', 'wire transfer', 'cash only'];
  v_word TEXT;
BEGIN
  -- Simple content moderation
  FOREACH v_word IN ARRAY v_flagged_words LOOP
    IF LOWER(NEW.message_text) LIKE '%' || v_word || '%' THEN
      NEW.is_flagged := TRUE;
      NEW.flagged_reason := 'Contains potentially suspicious content: ' || v_word;
      EXIT;
    END IF;
  END LOOP;
  
  -- Character limit check
  IF LENGTH(NEW.message_text) > 2000 THEN
    RAISE EXCEPTION 'Message too long. Maximum 2000 characters allowed.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update get_user_subscription function
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_id uuid, subscription_role text DEFAULT NULL::text)
 RETURNS TABLE(subscription_id uuid, stripe_customer_id text, stripe_subscription_id text, plan_type text, status text, role text, current_period_end timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT 
    s.id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.plan_type,
    s.status,
    s.role,
    s.current_period_end
  FROM public.subscriptions s
  WHERE s.user_id = $1 
  AND (subscription_role IS NULL OR s.role = subscription_role)
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- Update handle_property_status_change_to_vacant function
CREATE OR REPLACE FUNCTION public.handle_property_status_change_to_vacant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  -- Only process if status changed from 'available' to 'vacant'
  IF OLD.status = 'available' AND NEW.status = 'vacant' THEN
    
    -- Update all pending applications for this property to 'withdrawn'
    -- and return application credits to affected tenants
    UPDATE public.property_applications 
    SET status = 'withdrawn', 
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'pending';
    
    -- Return application credits to affected tenants
    UPDATE public.tenant_profiles 
    SET free_applications_remaining = free_applications_remaining + 1,
        updated_at = now()
    WHERE user_id IN (
      SELECT tenant_id 
      FROM public.property_applications 
      WHERE property_id = NEW.id 
        AND status = 'withdrawn'
        AND updated_at = now()
    );
    
    -- Deactivate any active tenant requests for this property
    UPDATE public.property_tenant_requests
    SET status = 'inactive',
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'active';
    
    -- Create notifications for affected tenants
    INSERT INTO public.notifications (user_id, title, description, type, link)
    SELECT 
      pa.tenant_id,
      'Application Credit Returned',
      'Your application credit has been returned because the property at ' || NEW.address || ' is no longer available. This is not a rejection - the property was withdrawn from the market. You can use your returned credit to apply for other properties.',
      'info',
      '/dashboard'
    FROM public.property_applications pa
    WHERE pa.property_id = NEW.id 
      AND pa.status = 'withdrawn'
      AND pa.updated_at = now();
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update get_admin_user_directory function
CREATE OR REPLACE FUNCTION public.get_admin_user_directory()
 RETURNS TABLE(id uuid, first_name text, last_name text, user_type user_type, company_name text, phone text, created_at timestamp with time zone, updated_at timestamp with time zone, email text, last_sign_in_at timestamp with time zone, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.user_type,
        p.company_name,
        p.phone,
        p.created_at,
        p.updated_at,
        au.email,
        au.last_sign_in_at,
        CASE 
            WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
            WHEN au.email_confirmed_at IS NULL THEN 'invited'
            ELSE 'suspended'
        END::text as status
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
$$;

-- Update validate_user_registration function
CREATE OR REPLACE FUNCTION public.validate_user_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Prevent duplicate emails (case insensitive)
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE LOWER(email) = LOWER(NEW.email) 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update handle_new_notification function
CREATE OR REPLACE FUNCTION public.handle_new_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  -- Insert corresponding email queue entry
  INSERT INTO public.email_queue (user_id, subject, body, link)
  VALUES (
    NEW.user_id,
    NEW.title,
    CONCAT(NEW.description, ' - ', to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS')),
    COALESCE(NEW.link, '/messages?tab=notifications')
  );
  
  RETURN NEW;
END;
$$;

-- Phase 1.2: Fix Security Definer View issue
-- Check if admin_user_directory view exists and fix it
DROP VIEW IF EXISTS public.admin_user_directory CASCADE;

-- Create a secure replacement view without SECURITY DEFINER
CREATE VIEW public.admin_user_directory AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.user_type,
    p.company_name,
    p.phone,
    p.created_at,
    p.updated_at,
    au.email,
    au.last_sign_in_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        WHEN au.email_confirmed_at IS NULL THEN 'invited'
        ELSE 'suspended'
    END::text as status
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE public.is_admin(auth.uid()) -- Access control via RLS instead of SECURITY DEFINER
ORDER BY p.created_at DESC;

-- Enable RLS on the new view
ALTER VIEW public.admin_user_directory ENABLE ROW LEVEL SECURITY;

-- Create policy for the view
CREATE POLICY "Admins can view user directory" 
ON public.admin_user_directory 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Phase 1.3: Enable security settings
-- These will be handled in the auth configuration panel