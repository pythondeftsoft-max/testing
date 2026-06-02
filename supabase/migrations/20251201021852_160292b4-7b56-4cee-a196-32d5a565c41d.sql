-- Fix test 8 tenant $2 payment for 5194 Coney Island Avenue
-- Placement fee ID: e4052cd7-fcbc-4601-8788-123c53768742
-- Session ID: cs_live_a17fa3ic0XYitnbTqYCUJM3bXJVwQQJN3JDyzwPPDy60X2ToZfokE8eGtq

DO $$
DECLARE
  v_tenant_id UUID;
  v_property_id UUID;
  v_unit_id UUID;
  v_application_id UUID;
  v_worker_id UUID;
BEGIN
  -- Get related IDs from the placement fee
  SELECT tenant_id, property_id, unit_id, marketplace_application_id
  INTO v_tenant_id, v_property_id, v_unit_id, v_application_id
  FROM landlord_placement_fees
  WHERE id = 'e4052cd7-fcbc-4601-8788-123c53768742';

  -- Get worker_id from marketplace_applications
  SELECT assigned_worker_id INTO v_worker_id
  FROM marketplace_applications
  WHERE id = v_application_id;

  -- Step 1: Update landlord_placement_fees to mark as paid
  UPDATE landlord_placement_fees
  SET 
    payment_status = 'paid',
    payment_date = NOW()::date,
    updated_at = NOW()
  WHERE id = 'e4052cd7-fcbc-4601-8788-123c53768742';

  -- Step 2: Update tenant profile
  UPDATE profiles
  SET 
    pipeline_stage = 'housed_paid',
    housing_status = 'housed',
    updated_at = NOW()
  WHERE id = v_tenant_id;

  -- Step 3: Update property unit
  UPDATE property_units
  SET 
    pipeline_stage = 'paid_housed',
    status = 'occupied',
    on_market = false,
    updated_at = NOW()
  WHERE id = v_unit_id;

  -- Step 4: Update parent property
  UPDATE properties
  SET 
    status = 'occupied',
    on_market = false,
    updated_at = NOW()
  WHERE id = v_property_id;

  -- Step 5: Update marketplace application
  UPDATE marketplace_applications
  SET 
    status = 'housed',
    lifecycle_stage = 'current_tenant',
    updated_at = NOW()
  WHERE id = v_application_id;

  -- Step 6: Award worker points if worker exists
  IF v_worker_id IS NOT NULL THEN
    INSERT INTO matchmaker_actions (
      worker_id,
      action_type,
      entity_type,
      entity_id,
      points_awarded,
      description
    ) VALUES (
      v_worker_id,
      'placement_fee_paid',
      'tenant',
      v_tenant_id,
      100,
      'Placement fee paid - 5194 Coney Island Avenue'
    );
  END IF;

  RAISE NOTICE 'Successfully fixed payment for placement fee e4052cd7-fcbc-4601-8788-123c53768742';
END $$;