-- Fix 115 Monteith Cir unit on_market status
UPDATE property_units
SET 
  on_market = false,
  updated_at = NOW()
WHERE property_id = '401a568f-75be-4670-8007-96d688fe358d';

-- Update deactivate_property (single param) to sync property_units
CREATE OR REPLACE FUNCTION deactivate_property(target_property_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the active listing request to inactive
  UPDATE property_tenant_requests
  SET 
    status = 'inactive',
    delisted_at = NOW(),
    updated_at = NOW()
  WHERE property_id = target_property_id
    AND unit_id IS NULL
    AND status = 'active';

  -- Mark associated contracts as inactive
  UPDATE property_listing_contracts
  SET contract_status = 'inactive'
  WHERE property_id = target_property_id
    AND unit_id IS NULL
    AND contract_status = 'active';

  -- Update property status
  UPDATE properties
  SET 
    status = 'deactivated',
    on_market = false,
    deactivated_at = NOW()
  WHERE id = target_property_id;

  -- NEW: Sync all units to off-market
  UPDATE property_units
  SET 
    on_market = false,
    updated_at = NOW()
  WHERE property_id = target_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update deactivate_property (two params) to set on_market and sync units
CREATE OR REPLACE FUNCTION public.deactivate_property(target_property_id uuid, deactivated_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the deactivating user is an admin or property owner
    IF NOT (is_admin(deactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = deactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can deactivate properties';
    END IF;

    -- Update property status to deactivated (removes from market)
    UPDATE public.properties 
    SET 
        status = 'deactivated',
        on_market = false,
        deactivated_at = now()
    WHERE id = target_property_id;

    -- NEW: Sync all units to off-market
    UPDATE property_units
    SET 
        on_market = false,
        updated_at = NOW()
    WHERE property_id = target_property_id;

    RETURN TRUE;
END;
$function$;

-- Update reactivate_property (single param) to sync available units
CREATE OR REPLACE FUNCTION reactivate_property(target_property_id UUID)
RETURNS UUID AS $$
DECLARE
  previous_listing_id_var UUID;
  new_listing_id UUID;
BEGIN
  -- Find the most recent listing (if exists)
  SELECT id INTO previous_listing_id_var
  FROM property_tenant_requests
  WHERE property_id = target_property_id
    AND unit_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create NEW listing record as a re-listing
  INSERT INTO property_tenant_requests (
    property_id,
    requested_by,
    status,
    listing_event_type,
    previous_listing_id,
    notes
  ) VALUES (
    target_property_id,
    auth.uid(),
    'active',
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 're_listing'
      ELSE 'initial_listing'
    END,
    previous_listing_id_var,
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 'Property re-listed on marketplace'
      ELSE 'Property initially listed on marketplace'
    END
  ) RETURNING id INTO new_listing_id;

  -- Update property status
  UPDATE properties
  SET 
    status = 'available',
    on_market = true,
    listed_at = NOW()
  WHERE id = target_property_id;

  -- NEW: Sync available units back to on-market
  UPDATE property_units
  SET 
    on_market = true,
    updated_at = NOW()
  WHERE property_id = target_property_id
    AND status = 'available';

  RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reactivate_property (two params) to set on_market and sync units
CREATE OR REPLACE FUNCTION public.reactivate_property(target_property_id uuid, reactivated_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the reactivating user is an admin or property owner
    IF NOT (is_admin(reactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = reactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can reactivate properties';
    END IF;

    -- Update property status to available (puts back on market)
    UPDATE public.properties 
    SET 
        status = 'available',
        on_market = true,
        deactivated_at = NULL
    WHERE id = target_property_id;

    -- NEW: Sync available units back to on-market
    UPDATE property_units
    SET 
        on_market = true,
        updated_at = NOW()
    WHERE property_id = target_property_id
      AND status = 'available';

    RETURN TRUE;
END;
$function$;