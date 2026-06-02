-- Update complete_lease_renewal function to handle HAP/tenant splits and property updates
-- This fixes the issue where lease renewals don't update rent splits and property addressing

-- Drop existing function
DROP FUNCTION IF EXISTS public.complete_lease_renewal(UUID, UUID, UUID, NUMERIC, DATE, TEXT);

-- Create enhanced function that handles rent splits and proper property updates
CREATE OR REPLACE FUNCTION public.complete_lease_renewal(
  p_renewal_id UUID,
  p_property_id UUID,
  p_tenant_id UUID,
  p_new_rent NUMERIC,
  p_new_lease_end DATE,
  p_contract_template TEXT,
  p_hap_portion NUMERIC DEFAULT NULL,
  p_tenant_portion NUMERIC DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_owner_id UUID;
  v_property_address TEXT;
  v_effective_hap_portion NUMERIC;
  v_effective_tenant_portion NUMERIC;
BEGIN
  -- Get property owner and address
  SELECT owner_id, address INTO v_property_owner_id, v_property_address
  FROM properties WHERE id = p_property_id;
  
  -- If HAP/tenant portions not provided, try to get from existing rent split
  IF p_hap_portion IS NULL OR p_tenant_portion IS NULL THEN
    SELECT pha_portion, tenant_portion 
    INTO v_effective_hap_portion, v_effective_tenant_portion
    FROM rent_splits 
    WHERE property_id = p_property_id 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- If no existing split found, calculate proportional split (60/40 default)
    IF v_effective_hap_portion IS NULL THEN
      v_effective_hap_portion := ROUND(p_new_rent * 0.6, 2);
      v_effective_tenant_portion := p_new_rent - v_effective_hap_portion;
    ELSE
      -- Scale existing proportions to new rent
      v_effective_hap_portion := ROUND(p_new_rent * (v_effective_hap_portion / (v_effective_hap_portion + v_effective_tenant_portion)), 2);
      v_effective_tenant_portion := p_new_rent - v_effective_hap_portion;
    END IF;
  ELSE
    v_effective_hap_portion := p_hap_portion;
    v_effective_tenant_portion := p_tenant_portion;
  END IF;
  
  -- Use provided portions if they were specified
  IF p_hap_portion IS NOT NULL THEN
    v_effective_hap_portion := p_hap_portion;
  END IF;
  IF p_tenant_portion IS NOT NULL THEN
    v_effective_tenant_portion := p_tenant_portion;
  END IF;
  
  -- Update property with new lease terms
  UPDATE properties SET
    monthly_rent = p_new_rent,
    lease_end_date = p_new_lease_end,
    lease_start_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_property_id;
  
  -- Update lease renewal status to completed
  UPDATE lease_renewals SET
    renewal_status = 'completed',
    updated_at = NOW()
  WHERE id = p_renewal_id;
  
  -- Create new rent split record for the new lease term
  INSERT INTO rent_splits (
    property_id,
    tenant_id,
    total_rent,
    pha_portion,
    tenant_portion,
    effective_date,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    p_tenant_id,
    p_new_rent,
    v_effective_hap_portion,
    v_effective_tenant_portion,
    CURRENT_DATE,
    true,
    NOW(),
    NOW()
  );
  
  -- Deactivate previous rent splits for this property
  UPDATE rent_splits SET
    is_active = false,
    updated_at = NOW()
  WHERE property_id = p_property_id 
    AND effective_date < CURRENT_DATE
    AND is_active = true;
  
  -- Save contract as property document
  INSERT INTO property_documents (
    property_id,
    document_type,
    file_name,
    file_path,
    uploaded_by,
    file_size,
    mime_type,
    metadata
  ) VALUES (
    p_property_id,
    'lease_renewal_contract',
    'Lease_Renewal_Contract_' || TO_CHAR(NOW(), 'YYYY_MM_DD_HH24_MI_SS') || '.txt',
    'contracts/lease_renewal_contract_' || p_renewal_id || '_' || EXTRACT(EPOCH FROM NOW()) || '.txt',
    v_property_owner_id,
    LENGTH(p_contract_template),
    'text/plain',
    jsonb_build_object(
      'renewal_id', p_renewal_id,
      'signed_by_landlord', true,
      'signed_by_tenant', true,
      'completion_date', NOW(),
      'new_rent', p_new_rent,
      'hap_portion', v_effective_hap_portion,
      'tenant_portion', v_effective_tenant_portion
    )
  );
  
  -- Send completion notifications
  INSERT INTO notifications (user_id, title, description, type) VALUES
  (v_property_owner_id, 'Lease Renewal Completed', 
   'The lease renewal contract for ' || v_property_address || ' has been fully executed. New monthly rent: $' || p_new_rent || ' (HAP: $' || v_effective_hap_portion || ', Tenant: $' || v_effective_tenant_portion || ').',
   'success'),
  (p_tenant_id, 'Lease Renewal Completed',
   'Your lease renewal for ' || v_property_address || ' has been completed. New monthly rent: $' || p_new_rent || ' (Your portion: $' || v_effective_tenant_portion || ').',
   'success');
  
  RETURN TRUE;
END;
$$;