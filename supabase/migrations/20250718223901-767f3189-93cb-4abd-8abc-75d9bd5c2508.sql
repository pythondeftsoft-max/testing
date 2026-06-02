
-- Drop the problematic policy that still causes recursion
DROP POLICY IF EXISTS "Portfolio owners and admin_partners can manage portfolio roles" ON public.portfolio_roles;

-- Create a simple, non-recursive policy that only allows portfolio owners
CREATE POLICY "Portfolio owners can manage portfolio roles" ON public.portfolio_roles
  FOR ALL USING (
    -- Only allow portfolio owners (via portfolios table) - no self-reference
    is_portfolio_owner(portfolio_id, auth.uid())
  );

-- Add a separate policy for users to view their own roles
CREATE POLICY "Users can view their own portfolio roles" ON public.portfolio_roles
  FOR SELECT USING (
    user_id = auth.uid()
  );
