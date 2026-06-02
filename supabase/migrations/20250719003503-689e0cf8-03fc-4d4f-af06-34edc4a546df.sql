
-- Drop the overly restrictive policy that blocks viewers from seeing properties
DROP POLICY "Portfolio members can manage properties" ON public.properties;

-- Create view-only policy for all portfolio members (including viewers)
CREATE POLICY "Portfolio members can view properties" 
ON public.properties FOR SELECT 
USING (
  (portfolio_id IS NOT NULL) AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
);

-- Create manage policy for admin_partner and editor only (INSERT/UPDATE/DELETE operations)
CREATE POLICY "Portfolio members can manage properties" 
ON public.properties FOR ALL 
USING (
  (portfolio_id IS NOT NULL) AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);
