
-- Phase 1.1: Fix Function Search Path Mutable warnings
-- Adding SET search_path = '' to all custom database functions for security

-- Update has_portfolio_role function
CREATE OR REPLACE FUNCTION public.has_portfolio_role(p_portfolio_id uuid, p_user_id uuid, p_roles portfolio_role_type[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles
    WHERE portfolio_id = p_portfolio_id
    AND user_id = p_user_id
    AND role_name = ANY(p_roles)
    AND is_active = true
  );
$$;

-- Update is_portfolio_owner function
CREATE OR REPLACE FUNCTION public.is_portfolio_owner(p_portfolio_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id = p_portfolio_id
    AND manager_id = p_user_id
  );
$$;

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 STABLE
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_type IN ('admin', 'individual_owner', 'property_manager', 'landlord')
  );
$$;

-- Update is_admin_safe function
CREATE OR REPLACE FUNCTION public.is_admin_safe(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND user_type = 'admin'::user_type
  );
$$;

-- Update check_portfolio_role_safe function
CREATE OR REPLACE FUNCTION public.check_portfolio_role_safe(p_portfolio_id uuid, p_user_id uuid, p_roles portfolio_role_type[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles
    WHERE portfolio_id = p_portfolio_id
    AND user_id = p_user_id
    AND role_name = ANY(p_roles)
    AND is_active = true
  );
$$;

-- Update get_user_portfolio_role function
CREATE OR REPLACE FUNCTION public.get_user_portfolio_role(p_portfolio_id uuid, p_user_id uuid)
 RETURNS portfolio_role_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT role_name FROM public.portfolio_roles
  WHERE portfolio_id = p_portfolio_id
  AND user_id = p_user_id
  AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'admin_partner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
      WHEN 'maintenance' THEN 4
    END
  LIMIT 1;
$$;

-- Update get_user_email function
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
    SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Update has_active_subscription function
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid, subscription_role text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = $1 
    AND status = 'active'
    AND (subscription_role IS NULL OR role = subscription_role)
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
$$;

-- Update count_landlord_properties function
CREATE OR REPLACE FUNCTION public.count_landlord_properties(landlord_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''  
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.properties 
  WHERE owner_id = landlord_id 
    AND deleted_at IS NULL 
    AND status != 'deleted';
$$;

-- Update calculate_billable_units function
CREATE OR REPLACE FUNCTION public.calculate_billable_units(landlord_id uuid, free_tier integer DEFAULT 10)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT GREATEST(0, public.count_landlord_properties(landlord_id) - free_tier);
$$;

-- Update count_portfolio_properties function
CREATE OR REPLACE FUNCTION public.count_portfolio_properties(portfolio_id_param uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.properties 
  WHERE portfolio_id = portfolio_id_param 
    AND deleted_at IS NULL 
    AND status != 'deleted';
$$;

-- Update calculate_portfolio_billable_units function
CREATE OR REPLACE FUNCTION public.calculate_portfolio_billable_units(portfolio_id_param uuid, free_tier integer DEFAULT 10)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT GREATEST(0, public.count_portfolio_properties(portfolio_id_param) - free_tier);
$$;

-- Phase 1.3: Add input validation to key functions
-- Update user_has_approved_application_for_property with validation
CREATE OR REPLACE FUNCTION public.user_has_approved_application_for_property(property_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  -- Input validation
  IF property_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.property_applications pa 
    WHERE pa.property_id = $1
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  );
END;
$$;

-- Add input validation to can_access_property_in_portfolio function
CREATE OR REPLACE FUNCTION public.can_access_property_in_portfolio(property_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  property_portfolio_id uuid;
  property_owner_id uuid;
BEGIN
  -- Input validation
  IF property_id IS NULL OR user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get property details
  SELECT portfolio_id, owner_id 
  INTO property_portfolio_id, property_owner_id
  FROM public.properties 
  WHERE id = property_id;
  
  -- If property doesn't exist, deny access
  IF property_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- If user is admin, allow access
  IF public.is_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- If user is the property owner, allow access
  IF property_owner_id = user_id THEN
    RETURN true;
  END IF;
  
  -- If property has no portfolio, only owner can access
  IF property_portfolio_id IS NULL THEN
    RETURN property_owner_id = user_id;
  END IF;
  
  -- Check if user is the portfolio manager
  IF EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE id = property_portfolio_id 
    AND manager_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Phase 1.4: Add rate limiting table for sensitive operations
CREATE TABLE IF NOT EXISTS public.operation_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean DEFAULT true,
  ip_address inet,
  UNIQUE(user_id, operation_type, attempted_at)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.operation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limiting table
CREATE POLICY "Users can view their own rate limit records" 
ON public.operation_rate_limits 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limit records" 
ON public.operation_rate_limits 
FOR ALL 
USING (true);

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_operation_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_operation_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Length validation
  IF length(p_operation_type) > 100 THEN
    RETURN false;
  END IF;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.operation_rate_limits
  WHERE user_id = p_user_id
    AND operation_type = p_operation_type
    AND attempted_at > (now() - (p_window_minutes || ' minutes')::interval);
  
  -- Allow if under limit
  IF attempt_count < p_max_attempts THEN
    -- Log this attempt
    INSERT INTO public.operation_rate_limits (user_id, operation_type)
    VALUES (p_user_id, p_operation_type);
    RETURN true;
  END IF;
  
  -- Log failed attempt
  INSERT INTO public.operation_rate_limits (user_id, operation_type, success)
  VALUES (p_user_id, p_operation_type, false);
  
  RETURN false;
END;
$$;

-- Phase 1.5: Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.portfolio_role_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_role portfolio_role_type,
  new_role portfolio_role_type,
  action_type text NOT NULL, -- 'create', 'update', 'delete', 'invite'
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.portfolio_role_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for audit table
CREATE POLICY "Portfolio admin_partners can view role audit logs" 
ON public.portfolio_role_audit 
FOR SELECT 
USING (public.has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

CREATE POLICY "System can create audit logs" 
ON public.portfolio_role_audit 
FOR INSERT 
WITH CHECK (true);

-- Add trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_portfolio_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.portfolio_role_audit (
      portfolio_id, target_user_id, changed_by, new_role, action_type
    ) VALUES (
      NEW.portfolio_id, NEW.user_id, COALESCE(NEW.added_by, auth.uid()), NEW.role_name, 'create'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.portfolio_role_audit (
      portfolio_id, target_user_id, changed_by, old_role, new_role, action_type
    ) VALUES (
      NEW.portfolio_id, NEW.user_id, auth.uid(), OLD.role_name, NEW.role_name, 'update'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.portfolio_role_audit (
      portfolio_id, target_user_id, changed_by, old_role, action_type
    ) VALUES (
      OLD.portfolio_id, OLD.user_id, auth.uid(), OLD.role_name, 'delete'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for role audit logging
DROP TRIGGER IF EXISTS portfolio_role_audit_trigger ON public.portfolio_roles;
CREATE TRIGGER portfolio_role_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_portfolio_role_changes();
