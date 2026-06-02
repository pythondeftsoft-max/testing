-- Update complete_lease_renewal function to also update property_units
CREATE OR REPLACE FUNCTION public.complete_lease_renewal(
  p_renewal_id UUID,
  p_tenant_id UUID,
  p_property_id UUID,
  p_new_rent DECIMAL,
  p_new_lease_end DATE,
  p_tenant_portion DECIMAL,
  p_hap_portion DECIMAL,
  p_contract_html TEXT,
  p_tenant_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_tenant_portion DECIMAL;
  v_effective_hap_portion DECIMAL;
  v_result JSON;
BEGIN
  -- Calculate effective portions
  v_effective_tenant_portion := COALESCE(p_tenant_portion, p_new_rent);
  v_effective_hap_portion := COALESCE(p_hap_portion, 0);

  -- Update property with new lease terms
  UPDATE properties SET
    monthly_rent = p_new_rent,
    lease_end_date = p_new_lease_end,
    lease_start_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_property_id;

  -- Update property_units with new lease terms
  -- For single-unit properties: update the one unit
  -- For multi-unit properties: update the unit where tenant is assigned
  UPDATE property_units SET
    unit_rent = p_new_rent,
    lease_start_date = CURRENT_DATE,
    lease_end_date = p_new_lease_end,
    tenant_portion = v_effective_tenant_portion,
    pha_portion = v_effective_hap_portion,
    updated_at = NOW()
  WHERE property_id = p_property_id
    AND deleted_at IS NULL
    AND (
      -- Single-unit property: update the only unit
      (SELECT COUNT(*) FROM property_units WHERE property_id = p_property_id AND deleted_at IS NULL) = 1
      OR
      -- Multi-unit property: update the unit assigned to this tenant
      tenant_id = p_tenant_id
    );

  -- Mark renewal as completed
  UPDATE lease_renewals SET
    renewal_status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_renewal_id;

  -- Create new rent split record
  INSERT INTO rent_splits (
    property_id,
    tenant_id,
    total_rent,
    tenant_portion,
    hap_portion,
    is_active,
    effective_date
  ) VALUES (
    p_property_id,
    p_tenant_id,
    p_new_rent,
    v_effective_tenant_portion,
    v_effective_hap_portion,
    true,
    CURRENT_DATE
  );

  -- Update contract with tenant signature
  UPDATE lease_renewal_contracts SET
    tenant_signature = p_tenant_signature,
    tenant_signed_at = NOW(),
    contract_status = 'completed',
    contract_html = p_contract_html,
    updated_at = NOW()
  WHERE lease_renewal_id = p_renewal_id;

  -- Create notifications for landlord and tenant
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES 
    (
      (SELECT owner_id FROM properties WHERE id = p_property_id),
      'Lease Renewal Completed',
      'A lease renewal has been completed and signed by the tenant.',
      'lease_renewal',
      p_renewal_id,
      'lease_renewal'
    ),
    (
      p_tenant_id,
      'Lease Renewal Completed',
      'Your lease renewal has been completed. Your new lease terms are now active.',
      'lease_renewal',
      p_renewal_id,
      'lease_renewal'
    );

  v_result := json_build_object(
    'success', true,
    'message', 'Lease renewal completed successfully',
    'new_rent', p_new_rent,
    'new_lease_end', p_new_lease_end
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error completing lease renewal: ' || SQLERRM
    );
END;
$$;