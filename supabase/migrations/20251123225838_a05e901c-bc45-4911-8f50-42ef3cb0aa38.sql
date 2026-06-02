-- Add missing priority_payment_amount column to marketplace_applications
ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS priority_payment_amount NUMERIC(10,2);

-- Drop and recreate admin_list_property_applications with correct column references
DROP FUNCTION IF EXISTS admin_list_property_applications(uuid, text, text);

CREATE OR REPLACE FUNCTION admin_list_property_applications(
  p_property_id UUID,
  p_status TEXT DEFAULT 'all',
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  property_id UUID,
  unit_id UUID,
  tenant_id UUID,
  status TEXT,
  priority_payment_made BOOLEAN,
  priority_payment_amount NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  tenant_first_name TEXT,
  tenant_last_name TEXT,
  tenant_phone TEXT,
  unit_number TEXT,
  unit_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.property_id,
    ma.unit_id,
    ma.user_id as tenant_id,
    ma.lifecycle_stage as status,
    ma.priority_payment_made,
    ma.priority_payment_amount,
    ma.created_at,
    ma.updated_at,
    p.first_name as tenant_first_name,
    p.last_name as tenant_last_name,
    p.phone_number as tenant_phone,
    pu.unit_number,
    pu.unit_name
  FROM marketplace_applications ma
  LEFT JOIN profiles p ON ma.user_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  WHERE ma.property_id = p_property_id
    AND (p_status = 'all' OR ma.lifecycle_stage = p_status)
    AND (
      p_search = '' OR 
      p.first_name ILIKE '%' || p_search || '%' OR
      p.last_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      pu.unit_number ILIKE '%' || p_search || '%'
    )
  ORDER BY ma.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;