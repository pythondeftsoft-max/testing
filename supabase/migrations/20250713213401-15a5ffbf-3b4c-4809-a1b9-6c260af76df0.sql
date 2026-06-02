-- Update create_referral_invitation function to check for duplicates
CREATE OR REPLACE FUNCTION public.create_referral_invitation(
    p_referrer_id uuid, 
    p_referred_name text, 
    p_referred_email text, 
    p_referred_phone text DEFAULT NULL::text
) 
RETURNS TABLE(referral_id uuid, referral_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_referral_code TEXT;
    v_referral_id UUID;
    v_existing_referral_id UUID;
BEGIN
    -- Normalize email to lowercase for consistency
    p_referred_email := LOWER(p_referred_email);
    
    -- Check if referral already exists for this email from this referrer
    SELECT id INTO v_existing_referral_id
    FROM public.referrals 
    WHERE referrer_id = p_referrer_id 
    AND LOWER(referred_email) = p_referred_email;
    
    IF v_existing_referral_id IS NOT NULL THEN
        RAISE EXCEPTION 'You have already sent a referral to this email address'
            USING ERRCODE = '23505'; -- unique_violation error code
    END IF;
    
    -- Generate unique referral code
    v_referral_code := public.generate_referral_code();
    
    -- Create referral record
    INSERT INTO public.referrals (
        referrer_id, 
        referral_code, 
        referred_email, 
        referred_name, 
        referred_phone, 
        invitation_sent_at,
        status
    ) VALUES (
        p_referrer_id,
        v_referral_code,
        p_referred_email,
        p_referred_name,
        p_referred_phone,
        now(),
        'invitation_sent'
    ) RETURNING id INTO v_referral_id;
    
    -- Create tracking event
    INSERT INTO public.referral_tracking_events (
        referral_id,
        event_type,
        metadata
    ) VALUES (
        v_referral_id,
        'invitation_sent',
        jsonb_build_object(
            'referred_name', p_referred_name,
            'referred_email', p_referred_email,
            'referred_phone', p_referred_phone
        )
    );
    
    -- Return referral details
    RETURN QUERY 
    SELECT v_referral_id, v_referral_code;
END;
$function$;