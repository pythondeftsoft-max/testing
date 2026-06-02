-- Fix admin analytics function to use correct column names
DROP FUNCTION IF EXISTS public.get_admin_analytics_overview();

CREATE OR REPLACE FUNCTION public.get_admin_analytics_overview()
RETURNS TABLE(
  total_properties integer,
  total_landlords integer,
  total_tenants integer,
  occupied_properties integer,
  vacant_properties integer,
  occupancy_rate numeric,
  total_monthly_rent numeric,
  collected_rent_mtd numeric,
  collection_rate numeric,
  maintenance_requests_open integer,
  maintenance_requests_completed_30d integer,
  avg_resolution_days numeric,
  total_applications_30d integer,
  approved_applications_30d integer,
  application_approval_rate numeric,
  late_payments_count integer,
  total_late_fees numeric,
  portfolio_count integer,
  avg_rent_per_unit numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH property_stats AS (
    SELECT 
      COUNT(*) as prop_count,
      COUNT(CASE WHEN p.status = 'occupied' THEN 1 END) as occupied_count,
      COUNT(CASE WHEN p.status = 'available' THEN 1 END) as vacant_count,
      COALESCE(SUM(p.monthly_rent), 0) as total_rent
    FROM properties p
    WHERE p.status != 'deleted'
  ),
  user_stats AS (
    SELECT 
      COUNT(CASE WHEN pr.user_type = 'landlord' THEN 1 END) as landlord_count,
      COUNT(CASE WHEN pr.user_type = 'tenant' THEN 1 END) as tenant_count
    FROM profiles pr
  ),
  payment_stats AS (
    SELECT 
      COALESCE(SUM(rp.amount), 0) as collected_mtd,
      COUNT(CASE WHEN rp.days_late > 0 THEN 1 END) as late_count,
      COALESCE(SUM(CASE WHEN rp.days_late > 0 THEN rp.late_fee_amount ELSE 0 END), 0) as late_fees
    FROM rent_payments rp
    WHERE date_trunc('month', rp.payment_date) = date_trunc('month', CURRENT_DATE)
  ),
  maintenance_stats AS (
    SELECT 
      COUNT(CASE WHEN mr.status != 'completed' THEN 1 END) as open_requests,
      COUNT(CASE WHEN mr.status = 'completed' AND mr.completed_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_30d,
      AVG(CASE 
        WHEN mr.status = 'completed' AND mr.completed_date IS NOT NULL 
        THEN EXTRACT(days FROM (mr.completed_date - mr.created_at))
      END) as avg_resolution
    FROM maintenance_requests mr
  ),
  application_stats AS (
    SELECT 
      COUNT(CASE WHEN pa.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as apps_30d,
      COUNT(CASE WHEN pa.status = 'approved' AND pa.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as approved_30d
    FROM property_applications pa
  ),
  portfolio_stats AS (
    SELECT COUNT(DISTINCT p.id) as portfolio_count
    FROM portfolios p
  )
  SELECT 
    ps.prop_count::integer,
    us.landlord_count::integer,
    us.tenant_count::integer,
    ps.occupied_count::integer,
    ps.vacant_count::integer,
    CASE WHEN ps.prop_count > 0 THEN (ps.occupied_count::numeric / ps.prop_count::numeric * 100) ELSE 0 END as occupancy_rate,
    ps.total_rent::numeric,
    pys.collected_mtd::numeric,
    CASE WHEN ps.total_rent > 0 THEN (pys.collected_mtd / ps.total_rent * 100) ELSE 0 END as collection_rate,
    ms.open_requests::integer,
    ms.completed_30d::integer,
    COALESCE(ms.avg_resolution, 0)::numeric,
    aps.apps_30d::integer,
    aps.approved_30d::integer,
    CASE WHEN aps.apps_30d > 0 THEN (aps.approved_30d::numeric / aps.apps_30d::numeric * 100) ELSE 0 END as approval_rate,
    pys.late_count::integer,
    pys.late_fees::numeric,
    pfs.portfolio_count::integer,
    CASE WHEN ps.prop_count > 0 THEN (ps.total_rent / ps.prop_count) ELSE 0 END as avg_rent
  FROM property_stats ps
  CROSS JOIN user_stats us
  CROSS JOIN payment_stats pys
  CROSS JOIN maintenance_stats ms
  CROSS JOIN application_stats aps
  CROSS JOIN portfolio_stats pfs;
END;
$$;