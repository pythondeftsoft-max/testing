-- Clean up existing duplicate placement fees

-- Step 1: Delete pending duplicates where a paid fee exists
DELETE FROM landlord_placement_fees lpf
WHERE lpf.payment_status = 'pending'
AND EXISTS (
  SELECT 1 FROM landlord_placement_fees paid
  WHERE paid.property_id = lpf.property_id
    AND paid.unit_id = lpf.unit_id
    AND paid.tenant_id = lpf.tenant_id
    AND paid.payment_status = 'paid'
);

-- Step 2: Delete older pending duplicates (keep only most recent)
DELETE FROM landlord_placement_fees lpf
WHERE lpf.payment_status = 'pending'
AND lpf.id NOT IN (
  SELECT DISTINCT ON (property_id, unit_id, tenant_id) id
  FROM landlord_placement_fees
  WHERE payment_status = 'pending'
  ORDER BY property_id, unit_id, tenant_id, created_at DESC
);

-- Step 3: Create unique index to prevent future duplicate pending fees
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_placement_fee 
ON landlord_placement_fees (property_id, unit_id, tenant_id) 
WHERE payment_status = 'pending';