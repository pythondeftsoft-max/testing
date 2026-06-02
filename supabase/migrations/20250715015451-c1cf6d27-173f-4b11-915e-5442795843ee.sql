-- Add expiration logic for lease renewals

-- Create function to check and expire overdue lease renewals
CREATE OR REPLACE FUNCTION public.expire_overdue_lease_renewals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update lease renewals that are past their response due date
    WITH expired_renewals AS (
        UPDATE public.lease_renewals 
        SET renewal_status = 'expired',
            updated_at = now()
        WHERE renewal_status IN ('sent', 'pending')
        AND response_due_date IS NOT NULL
        AND response_due_date < CURRENT_DATE
        RETURNING id, tenant_id, property_id
    )
    SELECT COUNT(*) INTO expired_count FROM expired_renewals;
    
    -- Create notifications for expired renewals
    INSERT INTO public.notifications (user_id, title, description, type)
    SELECT 
        er.tenant_id,
        'Lease Renewal Offer Expired',
        'Your lease renewal offer for ' || p.address || ' has expired. Please contact your landlord.',
        'warning'
    FROM (
        SELECT * FROM public.lease_renewals 
        WHERE renewal_status = 'expired' 
        AND updated_at::date = CURRENT_DATE
    ) er
    JOIN public.properties p ON er.property_id = p.id
    WHERE er.tenant_id IS NOT NULL;
    
    RETURN expired_count;
END;
$$;

-- Add function to handle lease renewal declines with reason
CREATE OR REPLACE FUNCTION public.decline_lease_renewal(
    p_renewal_id uuid, 
    p_user_id uuid, 
    p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    renewal_record RECORD;
    target_user_id uuid;
    notification_title text;
    notification_description text;
BEGIN
    -- Get renewal record
    SELECT * INTO renewal_record
    FROM public.lease_renewals lr
    JOIN public.properties p ON lr.property_id = p.id
    WHERE lr.id = p_renewal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lease renewal not found';
    END IF;
    
    -- Check if user has permission to decline
    IF renewal_record.tenant_id != p_user_id AND renewal_record.owner_id != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized to decline this lease renewal';
    END IF;
    
    -- Update renewal status
    UPDATE public.lease_renewals 
    SET renewal_status = 'declined',
        notes = CASE 
            WHEN p_reason IS NOT NULL THEN 
                COALESCE(notes || E'\n\n', '') || 'Decline reason: ' || p_reason
            ELSE notes
        END,
        tenant_response_date = CASE 
            WHEN renewal_record.tenant_id = p_user_id THEN CURRENT_DATE
            ELSE tenant_response_date
        END,
        updated_at = now()
    WHERE id = p_renewal_id;
    
    -- Determine who to notify
    IF renewal_record.tenant_id = p_user_id THEN
        -- Tenant declined, notify landlord
        target_user_id := renewal_record.owner_id;
        notification_title := 'Lease Renewal Declined by Tenant';
        notification_description := 'The tenant has declined the lease renewal offer for ' || renewal_record.address;
    ELSE
        -- Landlord declined, notify tenant
        target_user_id := renewal_record.tenant_id;
        notification_title := 'Lease Renewal Request Rejected';
        notification_description := 'Your lease renewal request for ' || renewal_record.address || ' has been rejected';
    END IF;
    
    -- Create notification
    INSERT INTO public.notifications (user_id, title, description, type)
    VALUES (target_user_id, notification_title, notification_description, 'warning');
    
    RETURN TRUE;
END;
$$;