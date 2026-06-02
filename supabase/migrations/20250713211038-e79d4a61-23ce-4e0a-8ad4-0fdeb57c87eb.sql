-- Function to track referral events
CREATE OR REPLACE FUNCTION public.track_referral_event(
    p_referral_code TEXT,
    p_event_type TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_id UUID;
    v_referral_status TEXT;
BEGIN
    -- Find referral by code
    SELECT id, status INTO v_referral_id, v_referral_status
    FROM public.referrals 
    WHERE referral_code = p_referral_code;
    
    IF v_referral_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Insert tracking event
    INSERT INTO public.referral_tracking_events (
        referral_id,
        event_type,
        metadata,
        notes
    ) VALUES (
        v_referral_id,
        p_event_type,
        p_metadata,
        p_notes
    );
    
    -- Update referral status based on event
    CASE p_event_type
        WHEN 'user_registered' THEN
            UPDATE public.referrals 
            SET status = 'registered', registered_at = now(), updated_at = now()
            WHERE id = v_referral_id;
            
        WHEN 'application_approved' THEN
            UPDATE public.referrals 
            SET status = 'approved', approved_at = now(), updated_at = now()
            WHERE id = v_referral_id;
            
        WHEN 'first_payment' THEN
            UPDATE public.referrals 
            SET status = 'first_payment', first_payment_at = now(), updated_at = now()
            WHERE id = v_referral_id;
            
        WHEN '60_day_milestone' THEN
            UPDATE public.referrals 
            SET status = 'qualified', sixty_day_milestone_at = now(), updated_at = now()
            WHERE id = v_referral_id;
            
            -- Award $100 gift card for qualified referral
            INSERT INTO public.referral_rewards (
                user_id, referral_id, reward_type, reward_amount, 
                reward_description, status
            ) VALUES (
                (SELECT referrer_id FROM public.referrals WHERE id = v_referral_id),
                v_referral_id, 
                'gift_card', 
                100.00,
                '$100 Gift Card for Successful Referral', 
                'available'
            );
            
        ELSE
            -- Just track the event without status change
    END CASE;
    
    RETURN TRUE;
END;
$$;

-- Function to get detailed referral analytics
CREATE OR REPLACE FUNCTION public.get_detailed_referral_stats(p_user_id UUID)
RETURNS TABLE(
    total_referrals INTEGER,
    pending_invitations INTEGER,
    registered_referrals INTEGER,
    approved_referrals INTEGER,
    qualified_referrals INTEGER,
    total_rewards_earned NUMERIC,
    available_rewards_count INTEGER,
    recent_events JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH referral_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'invitation_sent' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified
        FROM public.referrals 
        WHERE referrer_id = p_user_id
    ),
    reward_stats AS (
        SELECT 
            COALESCE(SUM(reward_amount), 0) as total_earned,
            COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count
        FROM public.referral_rewards 
        WHERE user_id = p_user_id
    ),
    recent_activity AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'event_type', rte.event_type,
                'timestamp', rte.event_timestamp,
                'referred_name', r.referred_name,
                'metadata', rte.metadata
            ) ORDER BY rte.event_timestamp DESC
        ) as events
        FROM public.referral_tracking_events rte
        JOIN public.referrals r ON r.id = rte.referral_id
        WHERE r.referrer_id = p_user_id
        AND rte.event_timestamp >= now() - INTERVAL '30 days'
        LIMIT 10
    )
    SELECT 
        rc.total::INTEGER,
        rc.pending::INTEGER,
        rc.registered::INTEGER,
        rc.approved::INTEGER,
        rc.qualified::INTEGER,
        rs.total_earned::NUMERIC,
        rs.available_count::INTEGER,
        COALESCE(ra.events, '[]'::jsonb) as recent_events
    FROM referral_counts rc
    CROSS JOIN reward_stats rs
    CROSS JOIN recent_activity ra;
END;
$$;