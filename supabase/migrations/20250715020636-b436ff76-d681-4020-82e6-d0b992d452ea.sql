-- Update the expire_overdue_lease_renewals function to be more comprehensive
CREATE OR REPLACE FUNCTION public.expire_overdue_lease_renewals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
  renewal_record RECORD;
BEGIN
  -- Find all lease renewals that are overdue (response_due_date passed and status is still 'sent')
  FOR renewal_record IN 
    SELECT lr.id, lr.property_id, lr.tenant_id, p.address, p.owner_id
    FROM lease_renewals lr
    JOIN properties p ON lr.property_id = p.id
    WHERE lr.renewal_status = 'sent' 
      AND lr.response_due_date < CURRENT_DATE
  LOOP
    -- Update status to expired
    UPDATE lease_renewals 
    SET renewal_status = 'expired', 
        updated_at = now()
    WHERE id = renewal_record.id;
    
    -- Notify tenant that offer has expired
    INSERT INTO notifications (user_id, title, description, type)
    VALUES (
      renewal_record.tenant_id,
      'Lease Renewal Offer Expired',
      'Your lease renewal offer for ' || renewal_record.address || ' has expired. Please contact your landlord if you are still interested in renewing.',
      'warning'
    );
    
    -- Notify landlord that offer has expired
    INSERT INTO notifications (user_id, title, description, type)
    VALUES (
      renewal_record.owner_id,
      'Lease Renewal Offer Expired',
      'The lease renewal offer for ' || renewal_record.address || ' has expired without a tenant response.',
      'info'
    );
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$;

-- Create a function to automatically run expiration checks (can be called by cron or manually)
CREATE OR REPLACE FUNCTION public.run_lease_renewal_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
  result JSONB;
BEGIN
  -- Expire overdue renewals
  SELECT expire_overdue_lease_renewals() INTO expired_count;
  
  -- Build result
  result := jsonb_build_object(
    'expired_renewals', expired_count,
    'processed_at', now()
  );
  
  RETURN result;
END;
$$;