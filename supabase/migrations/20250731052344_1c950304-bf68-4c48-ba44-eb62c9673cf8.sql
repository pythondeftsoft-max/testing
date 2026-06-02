-- Add RLS policy for portfolio members to view units in their portfolios
CREATE POLICY "Portfolio members can view portfolio units" 
ON public.property_units 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM properties p
    WHERE p.id = property_units.property_id 
    AND p.portfolio_id IS NOT NULL
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

-- Create a function to get portfolio metrics that can bypass RLS for aggregation
CREATE OR REPLACE FUNCTION public.get_portfolio_metrics(p_portfolio_id text)
RETURNS TABLE(
  unit_count integer,
  occupancy_rate numeric,
  monthly_profit numeric,
  gross_monthly_rent numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_portfolio_id = 'everything' THEN
    -- For "everything" view, aggregate all units from all portfolios the user has access to
    RETURN QUERY
    SELECT 
      COUNT(pu.*)::integer as unit_count,
      CASE 
        WHEN COUNT(pu.*) > 0 THEN 
          (COUNT(CASE WHEN pu.status = 'occupied' THEN 1 END)::numeric / COUNT(pu.*)::numeric * 100)
        ELSE 0 
      END as occupancy_rate,
      (COALESCE(SUM(pu.monthly_rent), 0) * 0.3)::numeric as monthly_profit,
      COALESCE(SUM(pu.monthly_rent), 0)::numeric as gross_monthly_rent
    FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE p.deleted_at IS NULL 
      AND p.status != 'deleted'
      AND (
        p.owner_id = auth.uid() 
        OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
      );
  ELSE
    -- For specific portfolio
    RETURN QUERY
    SELECT 
      COUNT(pu.*)::integer as unit_count,
      CASE 
        WHEN COUNT(pu.*) > 0 THEN 
          (COUNT(CASE WHEN pu.status = 'occupied' THEN 1 END)::numeric / COUNT(pu.*)::numeric * 100)
        ELSE 0 
      END as occupancy_rate,
      (COALESCE(SUM(pu.monthly_rent), 0) * 0.3)::numeric as monthly_profit,
      COALESCE(SUM(pu.monthly_rent), 0)::numeric as gross_monthly_rent
    FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE p.portfolio_id = p_portfolio_id::uuid
      AND p.deleted_at IS NULL 
      AND p.status != 'deleted'
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]);
  END IF;
END;
$$;