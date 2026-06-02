-- Update complete_lease_renewal function to use current_lease_end as new lease start date
CREATE OR REPLACE FUNCTION public.complete_lease_renewal(p_renewal_id uuid, p_signed_contract_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_renewal lease_renewals%ROWTYPE;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_current_lease_end DATE;
  v_new_lease_end DATE;
  v_new_rent numeric;
  v_hap_portion numeric;
  v_tenant_portion numeric;
BEGIN
  -- Get renewal details
  SELECT * INTO v_renewal FROM lease_renewals WHERE id = p_renewal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal not found';
  END IF;

  -- Get the current lease end date (this becomes the new lease start date)
  v_current_lease_end := v_renewal.current_lease_end;
  v_new_lease_end := v_renewal.new_lease_end;
  v_new_rent := v_renewal.new_rent;
  v_property_id := v_renewal.property_id;
  v_unit_id := v_renewal.unit_id;
  v_tenant_id := v_renewal.tenant_id;
  v_hap_portion := COALESCE(v_renewal.hap_portion, 0);
  v_tenant_portion := COALESCE(v_renewal.tenant_portion, v_new_rent);

  -- Update property lease dates and rent
  UPDATE properties 
  SET 
    lease_start_date = v_current_lease_end,
    lease_end_date = v_new_lease_end,
    monthly_rent = v_new_rent,
    updated_at = now()
  WHERE id = v_property_id;

  -- Update unit lease dates and rent
  UPDATE property_units
  SET
    lease_start_date = v_current_lease_end,
    lease_end_date = v_new_lease_end,
    unit_rent = v_new_rent,
    updated_at = now()
  WHERE id = v_unit_id;

  -- Update lease renewal record
  UPDATE lease_renewals
  SET
    status = 'completed',
    signed_at = now(),
    signed_contract_url = p_signed_contract_url,
    updated_at = now()
  WHERE id = p_renewal_id;

  -- Update rent splits if they exist
  IF EXISTS (
    SELECT 1 FROM rent_splits 
    WHERE property_id = v_property_id 
    AND unit_id = v_unit_id
    AND tenant_id = v_tenant_id
  ) THEN
    -- Update existing rent split with new effective date
    UPDATE rent_splits
    SET
      total_rent = v_new_rent,
      pha_portion = v_hap_portion,
      tenant_portion = v_tenant_portion,
      effective_date = v_current_lease_end,
      updated_at = now()
    WHERE property_id = v_property_id
      AND unit_id = v_unit_id
      AND tenant_id = v_tenant_id;
  ELSE
    -- Create new rent split if one doesn't exist
    INSERT INTO rent_splits (
      property_id,
      unit_id,
      tenant_id,
      total_rent,
      pha_portion,
      tenant_portion,
      effective_date
    ) VALUES (
      v_property_id,
      v_unit_id,
      v_tenant_id,
      v_new_rent,
      v_hap_portion,
      v_tenant_portion,
      v_current_lease_end
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lease renewal completed successfully'
  );
END;
$$;