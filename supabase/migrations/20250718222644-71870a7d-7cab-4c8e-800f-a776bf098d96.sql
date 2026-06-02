
-- Add RLS policy for portfolio role-based access
-- This allows users who have been granted portfolio roles to view those portfolios
CREATE POLICY "Members can view invited portfolios" 
ON public.portfolios 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.portfolio_roles pr
    WHERE pr.portfolio_id = portfolios.id
    AND pr.user_id = auth.uid()
    AND pr.is_active = true
  )
);
