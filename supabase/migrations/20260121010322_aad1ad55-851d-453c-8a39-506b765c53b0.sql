-- Fix overly permissive tax_profiles RLS policy
-- Remove 'viewer' role access to sensitive tax data (SSN/EIN, W-9 forms)

DROP POLICY IF EXISTS "Portfolio members can view tax profiles" ON public.tax_profiles;

-- Recreate with restricted access (admin_partner and editor only, NO viewer)
CREATE POLICY "Portfolio members can view tax profiles" ON public.tax_profiles
FOR SELECT USING (
  (portfolio_id IS NOT NULL) AND has_portfolio_role(
    portfolio_id, 
    auth.uid(), 
    ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
  )
);