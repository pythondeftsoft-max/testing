-- Fix infinite recursion in portfolio_assets RLS policies

-- First, create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_has_portfolio_asset_access(p_portfolio_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Check if user has portfolio role access
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles pr 
    WHERE pr.portfolio_id = p_portfolio_id 
    AND pr.user_id = p_user_id 
    AND pr.is_active = true
    AND pr.role_name IN ('admin_partner', 'editor', 'viewer')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_portfolio_assets(p_portfolio_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Check if user has management role access
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles pr 
    WHERE pr.portfolio_id = p_portfolio_id 
    AND pr.user_id = p_user_id 
    AND pr.is_active = true
    AND pr.role_name IN ('admin_partner', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_asset_membership(p_asset_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Check if user has direct asset membership
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_asset_memberships pam
    WHERE pam.asset_id = p_asset_id 
    AND pam.user_id = p_user_id 
    AND pam.is_active = true
  );
$$;

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Asset members can view the asset" ON public.portfolio_assets;
DROP POLICY IF EXISTS "Portfolio managers can manage portfolio assets" ON public.portfolio_assets;
DROP POLICY IF EXISTS "Portfolio viewers can view portfolio assets" ON public.portfolio_assets;

-- Create new non-recursive policies using security definer functions
CREATE POLICY "Users with portfolio access can view assets"
  ON public.portfolio_assets
  FOR SELECT
  USING (
    public.user_has_portfolio_asset_access(portfolio_id, auth.uid()) OR
    public.user_has_asset_membership(id, auth.uid())
  );

CREATE POLICY "Users with management access can manage assets"
  ON public.portfolio_assets
  FOR ALL
  USING (public.user_can_manage_portfolio_assets(portfolio_id, auth.uid()));

-- Ensure portfolio_asset_memberships has proper policies without recursion
DROP POLICY IF EXISTS "Portfolio asset members can view memberships" ON public.portfolio_asset_memberships;
DROP POLICY IF EXISTS "Portfolio managers can manage memberships" ON public.portfolio_asset_memberships;

CREATE POLICY "Users can view their own memberships"
  ON public.portfolio_asset_memberships
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Portfolio managers can manage all memberships"
  ON public.portfolio_asset_memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = portfolio_asset_memberships.asset_id
      AND public.user_can_manage_portfolio_assets(pa.portfolio_id, auth.uid())
    )
  );