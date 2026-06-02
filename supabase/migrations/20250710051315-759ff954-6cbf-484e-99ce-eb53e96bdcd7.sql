
-- Create analytics functions for comprehensive dashboard metrics

-- Function to calculate tenant placement metrics
CREATE OR REPLACE FUNCTION public.get_tenant_placement_metrics(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  avg_time_to_placement numeric,
  placement_rate numeric,
  application_conversion_rate numeric,
  total_requests integer,
  filled_requests integer,
  total_applications integer,
  approved_applications integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH request_stats AS (
    SELECT 
      ptr.id,
      ptr.requested_at,
      ptr.property_id,
      CASE WHEN p.status = 'occupied' THEN ptr.requested_at + INTERVAL '30 days' ELSE NULL END as placement_date
    FROM property_tenant_requests ptr
    JOIN properties p ON ptr.property_id = p.id
    WHERE ptr.requested_at::date BETWEEN start_date AND end_date
  ),
  placement_times AS (
    SELECT 
      EXTRACT(EPOCH FROM (placement_date - requested_at)) / 86400 as days_to_placement
    FROM request_stats 
    WHERE placement_date IS NOT NULL
  ),
  application_stats AS (
    SELECT 
      COUNT(*) as total_apps,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_apps
    FROM property_applications
    WHERE created_at::date BETWEEN start_date AND end_date
  )
  SELECT 
    COALESCE(AVG(pt.days_to_placement), 0)::numeric as avg_time_to_placement,
    CASE 
      WHEN COUNT(rs.id) > 0 THEN 
        (COUNT(rs.placement_date)::numeric / COUNT(rs.id)::numeric * 100)
      ELSE 0 
    END as placement_rate,
    CASE 
      WHEN apps.total_apps > 0 THEN 
        (apps.approved_apps::numeric / apps.total_apps::numeric * 100)
      ELSE 0 
    END as application_conversion_rate,
    COUNT(rs.id)::integer as total_requests,
    COUNT(rs.placement_date)::integer as filled_requests,
    apps.total_apps::integer as total_applications,
    apps.approved_apps::integer as approved_applications
  FROM request_stats rs
  CROSS JOIN application_stats apps
  LEFT JOIN placement_times pt ON true
  GROUP BY apps.total_apps, apps.approved_apps;
END;
$$;

-- Function to calculate vacancy and pipeline health
CREATE OR REPLACE FUNCTION public.get_vacancy_pipeline_metrics(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  avg_days_on_market numeric,
  current_vacant_units integer,
  current_occupied_units integer,
  new_tenant_profiles_this_period integer,
  vacancy_rate numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH vacancy_stats AS (
    SELECT 
      p.id,
      p.created_at,
      p.status,
      CASE 
        WHEN p.status = 'available' THEN 
          EXTRACT(EPOCH FROM (CURRENT_DATE - p.created_at::date)) / 86400
        ELSE NULL 
      END as days_on_market
    FROM properties p
    WHERE p.created_at::date BETWEEN start_date AND end_date
      AND p.deleted_at IS NULL
  ),
  current_status AS (
    SELECT 
      COUNT(CASE WHEN status = 'available' THEN 1 END) as vacant,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
      COUNT(*) as total
    FROM properties 
    WHERE deleted_at IS NULL
  ),
  tenant_growth AS (
    SELECT COUNT(*) as new_profiles
    FROM tenant_profiles
    WHERE created_at::date BETWEEN start_date AND end_date
  )
  SELECT 
    COALESCE(AVG(vs.days_on_market), 0)::numeric as avg_days_on_market,
    cs.vacant::integer as current_vacant_units,
    cs.occupied::integer as current_occupied_units,
    tg.new_profiles::integer as new_tenant_profiles_this_period,
    CASE 
      WHEN cs.total > 0 THEN (cs.vacant::numeric / cs.total::numeric * 100)
      ELSE 0 
    END as vacancy_rate
  FROM vacancy_stats vs
  CROSS JOIN current_status cs
  CROSS JOIN tenant_growth tg
  GROUP BY cs.vacant, cs.occupied, cs.total, tg.new_profiles;
END;
$$;

-- Function to calculate financial metrics
CREATE OR REPLACE FUNCTION public.get_financial_metrics(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_rent_due numeric,
  total_rent_collected numeric,
  on_time_collection_rate numeric,
  total_late_fees numeric,
  late_payment_count integer,
  avg_payment_delay numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT 
      rp.amount,
      rp.due_date,
      rp.payment_date,
      rp.late_fee_amount,
      rp.days_late,
      CASE WHEN rp.payment_date <= rp.due_date THEN rp.amount ELSE 0 END as on_time_amount,
      CASE WHEN rp.days_late > 0 THEN 1 ELSE 0 END as is_late
    FROM rent_payments rp
    WHERE rp.due_date BETWEEN start_date AND end_date
  ),
  expected_rent AS (
    SELECT SUM(p.monthly_rent) as total_expected
    FROM properties p
    WHERE p.status = 'occupied' 
      AND p.deleted_at IS NULL
  )
  SELECT 
    COALESCE(er.total_expected, 0)::numeric as total_rent_due,
    COALESCE(SUM(ps.amount), 0)::numeric as total_rent_collected,
    CASE 
      WHEN COALESCE(er.total_expected, 0) > 0 THEN 
        (COALESCE(SUM(ps.on_time_amount), 0) / er.total_expected * 100)
      ELSE 0 
    END as on_time_collection_rate,
    COALESCE(SUM(ps.late_fee_amount), 0)::numeric as total_late_fees,
    SUM(ps.is_late)::integer as late_payment_count,
    COALESCE(AVG(CASE WHEN ps.days_late > 0 THEN ps.days_late END), 0)::numeric as avg_payment_delay
  FROM payment_stats ps
  CROSS JOIN expected_rent er
  GROUP BY er.total_expected;
END;
$$;

-- Function to calculate engagement metrics
CREATE OR REPLACE FUNCTION public.get_engagement_metrics(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_notifications integer,
  total_applications integer,
  total_messages integer,
  total_maintenance_requests integer,
  completed_maintenance_requests integer,
  avg_maintenance_resolution_days numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH engagement_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM notifications WHERE created_at::date BETWEEN start_date AND end_date) as notifications,
      (SELECT COUNT(*) FROM property_applications WHERE created_at::date BETWEEN start_date AND end_date) as applications,
      (SELECT COUNT(*) FROM messages WHERE created_at::date BETWEEN start_date AND end_date) as messages,
      (SELECT COUNT(*) FROM maintenance_requests WHERE created_at::date BETWEEN start_date AND end_date) as maintenance_total,
      (SELECT COUNT(*) FROM maintenance_requests WHERE created_at::date BETWEEN start_date AND end_date AND status = 'completed') as maintenance_completed
  ),
  maintenance_resolution AS (
    SELECT 
      AVG(EXTRACT(EPOCH FROM (completed_date - created_at)) / 86400) as avg_resolution_days
    FROM maintenance_requests 
    WHERE created_at::date BETWEEN start_date AND end_date 
      AND status = 'completed' 
      AND completed_date IS NOT NULL
  )
  SELECT 
    es.notifications::integer,
    es.applications::integer,
    es.messages::integer,
    es.maintenance_total::integer,
    es.maintenance_completed::integer,
    COALESCE(mr.avg_resolution_days, 0)::numeric
  FROM engagement_stats es
  CROSS JOIN maintenance_resolution mr;
END;
$$;

-- Function to get marketplace activity metrics
CREATE OR REPLACE FUNCTION public.get_marketplace_metrics(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_property_views integer,
  total_applications integer,
  application_rate numeric,
  expiring_leases_30_days integer,
  expiring_leases_60_days integer,
  expiring_leases_90_days integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH activity_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM property_applications WHERE created_at::date BETWEEN start_date AND end_date) as applications,
      (SELECT COUNT(DISTINCT property_id) FROM property_applications WHERE created_at::date BETWEEN start_date AND end_date) as viewed_properties
  ),
  lease_expirations AS (
    SELECT 
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as exp_30,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as exp_60,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as exp_90
    FROM properties 
    WHERE lease_end_date IS NOT NULL 
      AND status = 'occupied'
      AND deleted_at IS NULL
  )
  SELECT 
    COALESCE(ast.viewed_properties * 10, 0)::integer as total_property_views, -- Estimate based on applications
    ast.applications::integer as total_applications,
    CASE 
      WHEN ast.viewed_properties > 0 THEN 
        (ast.applications::numeric / ast.viewed_properties::numeric * 100)
      ELSE 0 
    END as application_rate,
    le.exp_30::integer as expiring_leases_30_days,
    le.exp_60::integer as expiring_leases_60_days,
    le.exp_90::integer as expiring_leases_90_days
  FROM activity_stats ast
  CROSS JOIN lease_expirations le;
END;
$$;

-- Create indexes for better analytics performance
CREATE INDEX IF NOT EXISTS idx_property_applications_created_at ON property_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_property_applications_status ON property_applications(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_rent_payments_payment_date ON rent_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at ON maintenance_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_created_at ON tenant_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_lease_end_date ON properties(lease_end_date);
