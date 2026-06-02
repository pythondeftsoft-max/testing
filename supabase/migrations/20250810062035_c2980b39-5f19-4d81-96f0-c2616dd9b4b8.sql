-- Populate portfolio_health_snapshots with initial baseline data
INSERT INTO public.portfolio_health_snapshots (
  landlord_id,
  portfolio_id,
  snapshot_date,
  total_units,
  occupied_units,
  vacant_units,
  occupancy_rate,
  gross_monthly_rent,
  collected_rent,
  collection_rate,
  net_operating_income,
  maintenance_requests_open,
  maintenance_requests_total,
  avg_resolution_days,
  maintenance_cost_per_unit,
  tenant_satisfaction_score,
  lease_renewals,
  lease_expirations,
  renewal_rate
)
SELECT 
  p.owner_id as landlord_id,
  p.portfolio_id,
  CURRENT_DATE as snapshot_date,
  COUNT(*) as total_units,
  COUNT(CASE WHEN p.status = 'occupied' THEN 1 END) as occupied_units,
  COUNT(CASE WHEN p.status = 'available' THEN 1 END) as vacant_units,
  ROUND(
    (COUNT(CASE WHEN p.status = 'occupied' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 
    2
  ) as occupancy_rate,
  COALESCE(SUM(p.monthly_rent), 0) as gross_monthly_rent,
  COALESCE(
    (SELECT SUM(rp.amount)
     FROM rent_payments rp 
     WHERE rp.property_id = ANY(ARRAY_AGG(p.id))
     AND rp.payment_date >= CURRENT_DATE - INTERVAL '30 days'
    ), 0
  ) as collected_rent,
  COALESCE(
    (SELECT AVG(
      CASE 
        WHEN rp.payment_date <= rp.due_date THEN 100.0 
        ELSE 0.0 
      END
    )
    FROM rent_payments rp 
    WHERE rp.property_id = ANY(ARRAY_AGG(p.id))
    AND rp.payment_date >= CURRENT_DATE - INTERVAL '30 days'
    ), 95.0
  ) as collection_rate,
  COALESCE(SUM(p.monthly_rent) - SUM(p.repair_costs), 0) as net_operating_income,
  COALESCE(
    (SELECT COUNT(*)
     FROM maintenance_requests mr
     WHERE mr.property_id = ANY(ARRAY_AGG(p.id))
     AND mr.status != 'completed'
    ), 0
  ) as maintenance_requests_open,
  COALESCE(
    (SELECT COUNT(*)
     FROM maintenance_requests mr
     WHERE mr.property_id = ANY(ARRAY_AGG(p.id))
     AND mr.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ), 0
  ) as maintenance_requests_total,
  15.0 as avg_resolution_days, -- Default average
  COALESCE(AVG(p.repair_costs), 150.0) as maintenance_cost_per_unit,
  4.2 as tenant_satisfaction_score, -- Default value
  0 as lease_renewals, -- Will be populated over time
  0 as lease_expirations, -- Will be populated over time
  85.0 as renewal_rate -- Default value
FROM properties p
WHERE p.deleted_at IS NULL 
  AND p.status != 'deleted'
  AND p.owner_id IS NOT NULL
GROUP BY p.owner_id, p.portfolio_id
HAVING COUNT(*) > 0;