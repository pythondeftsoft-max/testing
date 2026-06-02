-- Enhance referrals table with additional tracking fields
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS referred_name TEXT,
ADD COLUMN IF NOT EXISTS referred_phone TEXT,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;

-- Create referral tracking events table for detailed audit trail
CREATE TABLE IF NOT EXISTS public.referral_tracking_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('invitation_sent', 'user_registered', 'application_submitted', 'application_approved', 'first_payment', '60_day_milestone')),
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.referral_tracking_events ENABLE ROW LEVEL SECURITY;

-- Create policies for referral tracking events
CREATE POLICY "Users can view their referral tracking events" 
ON public.referral_tracking_events 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.referrals 
        WHERE referrals.id = referral_tracking_events.referral_id 
        AND referrals.referrer_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all referral tracking events" 
ON public.referral_tracking_events 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert tracking events" 
ON public.referral_tracking_events 
FOR INSERT 
WITH CHECK (true);

-- Create function to create referral and send invitation
CREATE OR REPLACE FUNCTION public.create_referral_invitation(
    p_referrer_id UUID,
    p_referred_name TEXT,
    p_referred_email TEXT,
    p_referred_phone TEXT DEFAULT NULL
)
RETURNS TABLE(referral_id UUID, referral_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_code TEXT;
    v_referral_id UUID;
BEGIN
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
$$;