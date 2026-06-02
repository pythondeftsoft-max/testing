-- Add unit-level HAP support to existing HAP tables
-- Phase 1: Add unit_id columns to HAP tables

-- Add unit_id to hap_payee_configs table
ALTER TABLE public.hap_payee_configs 
ADD COLUMN unit_id uuid REFERENCES public.property_units(id) ON DELETE CASCADE;

-- Add unit_id to hap_payments table
ALTER TABLE public.hap_payments 
ADD COLUMN unit_id uuid REFERENCES public.property_units(id) ON DELETE CASCADE;

-- Add unit_id to rent_splits table
ALTER TABLE public.rent_splits 
ADD COLUMN unit_id uuid REFERENCES public.property_units(id) ON DELETE CASCADE;

-- Add HAP tracking fields to property_units table
ALTER TABLE public.property_units
ADD COLUMN has_voucher boolean DEFAULT false,
ADD COLUMN voucher_type text DEFAULT 'section8',
ADD COLUMN voucher_amount numeric DEFAULT 0,
ADD COLUMN pha_portion numeric DEFAULT 0,
ADD COLUMN tenant_portion numeric DEFAULT 0,
ADD COLUMN pha_payment_day integer DEFAULT 1,
ADD COLUMN tenant_payment_day integer DEFAULT 1,
ADD COLUMN pha_contact_name text,
ADD COLUMN pha_contact_email text,
ADD COLUMN pha_contact_phone text;

-- Update RLS policies to handle unit-level access
-- Update hap_payee_configs RLS policy
DROP POLICY IF EXISTS "Property owners can manage HAP payee configs" ON public.hap_payee_configs;
CREATE POLICY "Property owners can manage HAP payee configs" ON public.hap_payee_configs
FOR ALL
USING (
  can_access_hap_features(auth.uid()) AND (
    (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = hap_payee_configs.property_id 
      AND properties.owner_id = auth.uid()
    )) OR
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM property_units pu 
      JOIN properties p ON pu.property_id = p.id
      WHERE pu.id = hap_payee_configs.unit_id 
      AND p.owner_id = auth.uid()
    ))
  )
);

-- Update hap_payments RLS policy
DROP POLICY IF EXISTS "Property owners can manage HAP payments" ON public.hap_payments;
CREATE POLICY "Property owners can manage HAP payments" ON public.hap_payments
FOR ALL
USING (
  can_access_hap_features(auth.uid()) AND (
    (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = hap_payments.property_id 
      AND properties.owner_id = auth.uid()
    )) OR
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM property_units pu 
      JOIN properties p ON pu.property_id = p.id
      WHERE pu.id = hap_payments.unit_id 
      AND p.owner_id = auth.uid()
    ))
  )
);

-- Update rent_splits RLS policy
DROP POLICY IF EXISTS "Property owners can manage rent splits" ON public.rent_splits;
CREATE POLICY "Property owners can manage rent splits" ON public.rent_splits
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM properties 
    WHERE properties.id = rent_splits.property_id 
    AND properties.owner_id = auth.uid()
  )) OR
  (unit_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM property_units pu 
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = rent_splits.unit_id 
    AND p.owner_id = auth.uid()
  ))
);

-- Add constraints to ensure either property_id or unit_id is set (but not both)
ALTER TABLE public.hap_payee_configs 
ADD CONSTRAINT chk_hap_payee_configs_property_or_unit 
CHECK ((property_id IS NOT NULL AND unit_id IS NULL) OR (property_id IS NULL AND unit_id IS NOT NULL));

ALTER TABLE public.hap_payments 
ADD CONSTRAINT chk_hap_payments_property_or_unit 
CHECK ((property_id IS NOT NULL AND unit_id IS NULL) OR (property_id IS NULL AND unit_id IS NOT NULL));

ALTER TABLE public.rent_splits 
ADD CONSTRAINT chk_rent_splits_property_or_unit 
CHECK ((property_id IS NOT NULL AND unit_id IS NULL) OR (property_id IS NULL AND unit_id IS NOT NULL));

-- Create indexes for better performance
CREATE INDEX idx_hap_payee_configs_unit_id ON public.hap_payee_configs(unit_id);
CREATE INDEX idx_hap_payments_unit_id ON public.hap_payments(unit_id);
CREATE INDEX idx_rent_splits_unit_id ON public.rent_splits(unit_id);
CREATE INDEX idx_property_units_has_voucher ON public.property_units(has_voucher);

-- Migrate existing property-level HAP data to unit-level for single-unit properties
-- This handles properties that only have one unit
UPDATE public.property_units 
SET has_voucher = p.has_voucher,
    voucher_type = COALESCE(rs.voucher_type, 'section8'),
    pha_portion = COALESCE(rs.pha_portion, 0),
    tenant_portion = COALESCE(rs.tenant_portion, p.monthly_rent)
FROM properties p
LEFT JOIN rent_splits rs ON p.id = rs.property_id
WHERE property_units.property_id = p.id
AND p.has_voucher = true
AND p.unit_count = 1;

-- Update existing HAP records to reference the unit instead of property for single-unit properties
UPDATE public.hap_payee_configs 
SET unit_id = pu.id, property_id = NULL
FROM property_units pu
JOIN properties p ON pu.property_id = p.id
WHERE hap_payee_configs.property_id = p.id 
AND p.unit_count = 1;

UPDATE public.hap_payments 
SET unit_id = pu.id, property_id = NULL
FROM property_units pu
JOIN properties p ON pu.property_id = p.id
WHERE hap_payments.property_id = p.id 
AND p.unit_count = 1;

UPDATE public.rent_splits 
SET unit_id = pu.id, property_id = NULL
FROM property_units pu
JOIN properties p ON pu.property_id = p.id
WHERE rent_splits.property_id = p.id 
AND p.unit_count = 1;