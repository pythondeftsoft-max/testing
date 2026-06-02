
-- Phase 2: Admin overrides and audit logs

-- 1) Admin action logs table
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,       -- e.g., 'property', 'unit', 'application'
  resource_id uuid,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_action_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'admin_action_logs' 
      AND policyname = 'Admins can view admin action logs'
  ) THEN
    CREATE POLICY "Admins can view admin action logs"
      ON public.admin_action_logs
      FOR SELECT
      USING (is_admin(auth.uid()));
  END IF;
END$$;

-- We do not create INSERT/UPDATE/DELETE policies intentionally.
-- Inserts will be performed exclusively through SECURITY DEFINER functions below.

-- 2) Admin override RPCs

-- 2a) Admin: set property market status (on/off)
CREATE OR REPLACE FUNCTION public.admin_set_property_market_status(
  p_property_id uuid,
  p_on_market boolean,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_admin(auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.properties
  SET on_market = p_on_market,
      updated_at = now()
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  INSERT INTO public.admin_action_logs (
    admin_user_id, action, resource_type, resource_id, reason, details
  ) VALUES (
    auth.uid(),
    CASE WHEN p_on_market THEN 'set_on_market' ELSE 'set_off_market' END,
    'property',
    p_property_id,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$function$;

-- 2b) Admin: remove tenant from property (vacate + keep off market)
CREATE OR REPLACE FUNCTION public.admin_remove_property_tenant(
  p_property_id uuid,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_admin(auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  -- Remove approved applications for this property
  DELETE FROM public.property_applications
  WHERE property_id = p_property_id
    AND status = 'approved';

  -- Mark property as vacant and off market
  UPDATE public.properties
  SET occupancy_status = 'vacant',
      on_market = false,
      updated_at = now()
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  INSERT INTO public.admin_action_logs (
    admin_user_id, action, resource_type, resource_id, reason, details
  ) VALUES (
    auth.uid(),
    'remove_tenant',
    'property',
    p_property_id,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$function$;

-- Helpful indexes for admin_action_logs
CREATE INDEX IF NOT EXISTS admin_action_logs_resource_idx ON public.admin_action_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS admin_action_logs_admin_idx ON public.admin_action_logs (admin_user_id, created_at DESC);
