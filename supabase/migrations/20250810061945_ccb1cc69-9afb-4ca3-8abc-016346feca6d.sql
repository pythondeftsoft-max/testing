-- Populate portfolio_health_snapshots with initial data for existing landlords
-- This creates baseline historical data so comparative analysis can work immediately

-- Function to create snapshot for all landlords with properties
INSERT INTO public.portfolio_health_snapshots (
  landlord_id,
  portfolio_id,
  total_units,
  vacancy_rate,
  collection_rate,
  maintenance_cost_per_unit,
  tenant_satisfaction_score,
  snapshot_date
)
SELECT 
  p.owner_id as landlord_id,
  p.portfolio_id,
  COUNT(*) as total_units,
  ROUND(
    (COUNT(CASE WHEN p.status = 'available' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 
    2
  ) as vacancy_rate,
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
  COALESCE(AVG(p.repair_costs), 150.0) as maintenance_cost_per_unit,
  4.2 as tenant_satisfaction_score, -- Default value until we have real satisfaction data
  CURRENT_DATE as snapshot_date
FROM properties p
WHERE p.deleted_at IS NULL 
  AND p.status != 'deleted'
  AND p.owner_id IS NOT NULL
GROUP BY p.owner_id, p.portfolio_id
HAVING COUNT(*) > 0;