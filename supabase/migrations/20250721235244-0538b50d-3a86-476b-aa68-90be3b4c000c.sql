
-- Phase 1: Critical Security & Schema Fixes

-- Step 1: Fix the account role enum mismatch
-- Update the account_role_type enum to match frontend expectations
ALTER TYPE account_role_type ADD VALUE IF NOT EXISTS 'co_owner';
ALTER TYPE account_role_type ADD VALUE IF NOT EXISTS 'support_assistant';

-- Step 2: Fix all function security warnings by adding SET search_path = ''
-- This prevents search_path manipulation attacks in security definer functions

-- Fix get_user_account_roles function
CREATE OR REPLACE FUNCTION public.get_user_account_roles(user_id_param UUID)
RETURNS TABLE(role_name account_role_type)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ar.role_name
  FROM public.account_roles ar
  WHERE ar.user_id = user_id_param 
    AND ar.is_active = true;
$$;

-- Fix has_account_role function
CREATE OR REPLACE FUNCTION public.has_account_role(user_id_param UUID, required_roles account_role_type[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_roles ar
    WHERE ar.user_id = user_id_param 
      AND ar.role_name = ANY(required_roles)
      AND ar.is_active = true
  );
$$;

-- Fix is_account_admin function
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT has_account_role(user_id_param, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
$$;

-- Fix get_user_email function
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Fix is_admin function (legacy support)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND user_type = 'admin'
  );
$$;

-- Fix user_has_approved_application_for_property function
CREATE OR REPLACE FUNCTION public.user_has_approved_application_for_property(property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.property_applications pa 
    WHERE pa.property_id = $1
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  );
END;
$$;

-- Fix has_active_subscription function
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

-- Fix get_user_subscription function
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

-- Fix get_admin_user_directory function
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

-- Fix count_landlord_properties function
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

-- Fix calculate_billable_units function
CREATE OR REPLACE FUNCTION public.calculate_billable_units(landlord_id uuid, free_tier integer DEFAULT 10)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT GREATEST(0, public.count_landlord_properties(landlord_id) - free_tier);
$$;

-- Fix count_portfolio_properties function
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

-- Fix calculate_portfolio_billable_units function
CREATE OR REPLACE FUNCTION public.calculate_portfolio_billable_units(portfolio_id_param uuid, free_tier integer DEFAULT 10)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT GREATEST(0, public.count_portfolio_properties(portfolio_id_param) - free_tier);
$$;

-- Fix get_user_portfolio_role function
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

-- Step 3: Create missing portfolio role helper function
CREATE OR REPLACE FUNCTION public.has_portfolio_role(p_portfolio_id uuid, p_user_id uuid, required_roles portfolio_role_type[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles pr
    WHERE pr.portfolio_id = p_portfolio_id
    AND pr.user_id = p_user_id
    AND pr.role_name = ANY(required_roles)
    AND pr.is_active = true
  );
$$;

-- Step 4: Create missing can_access_hap_features function
CREATE OR REPLACE FUNCTION public.can_access_hap_features(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_active_subscription(user_id_param, 'landlord') OR public.is_admin(user_id_param);
$$;

-- Step 5: Add foreign key constraint that was missing
ALTER TABLE public.account_roles 
ADD CONSTRAINT account_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 6: Add missing granted_by and granted_at columns to account_roles
ALTER TABLE public.account_roles 
ADD COLUMN IF NOT EXISTS granted_by uuid,
ADD COLUMN IF NOT EXISTS granted_at timestamp with time zone DEFAULT now();

-- Step 7: Update existing account_roles records to have granted_at
UPDATE public.account_roles 
SET granted_at = created_at 
WHERE granted_at IS NULL;

-- Step 8: Create function to get highest account role
CREATE OR REPLACE FUNCTION public.get_highest_account_role(p_user_id uuid)
RETURNS account_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role_name FROM public.account_roles
  WHERE user_id = p_user_id
  AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'owner' THEN 1
      WHEN 'co_owner' THEN 2
      WHEN 'admin_partner' THEN 3
      WHEN 'support_assistant' THEN 4
    END
  LIMIT 1;
$$;
