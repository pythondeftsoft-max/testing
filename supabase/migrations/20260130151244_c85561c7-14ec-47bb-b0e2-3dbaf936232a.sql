-- Allow portfolio team members with high permissions to update portfolios
CREATE POLICY "Portfolio admins can update portfolio info"
ON portfolios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolio_roles pr
    WHERE pr.portfolio_id = portfolios.id
    AND pr.user_id = auth.uid()
    AND pr.is_active = true
    AND pr.role_name IN ('admin_partner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolio_roles pr
    WHERE pr.portfolio_id = portfolios.id
    AND pr.user_id = auth.uid()
    AND pr.is_active = true
    AND pr.role_name IN ('admin_partner', 'editor')
  )
);