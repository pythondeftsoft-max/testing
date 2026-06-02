-- Fix referrals table status constraint to allow 'invitation_sent'
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;

-- Add updated constraint with all valid status values
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check 
CHECK (status IN ('invitation_sent', 'registered', 'approved', 'first_payment', 'qualified', 'expired'));

-- Update generate_referral_code function to be more efficient
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code for better uniqueness
    code := upper(substr(md5(random()::text || now()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
    
    -- Exit loop if code is unique
    IF NOT exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$function$;

-- Create function to handle user registration with referral code
CREATE OR REPLACE FUNCTION public.handle_referral_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    referral_code_param TEXT;
    referral_record RECORD;
BEGIN
    -- Extract referral code from user metadata
    referral_code_param := NEW.raw_user_meta_data ->> 'referral_code';
    
    IF referral_code_param IS NOT NULL THEN
        -- Find the referral record
        SELECT * INTO referral_record 
        FROM public.referrals 
        WHERE referral_code = referral_code_param 
        AND status = 'invitation_sent';
        
        IF FOUND THEN
            -- Update referral with referred user info
            UPDATE public.referrals 
            SET referred_user_id = NEW.id,
                registered_at = now(),
                status = 'registered',
                updated_at = now()
            WHERE id = referral_record.id;
            
            -- Create tracking event
            INSERT INTO public.referral_tracking_events (
                referral_id,
                event_type,
                metadata
            ) VALUES (
                referral_record.id,
                'user_registered',
                jsonb_build_object(
                    'user_id', NEW.id,
                    'email', NEW.email,
                    'registered_at', now()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for user registration
DROP TRIGGER IF EXISTS on_user_registered_with_referral ON auth.users;
CREATE TRIGGER on_user_registered_with_referral
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_referral_registration();

-- Create function to track application approval
CREATE OR REPLACE FUNCTION public.handle_application_approval_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    referral_record RECORD;
BEGIN
    -- Only process when status changes to approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Find referral for this tenant
        SELECT * INTO referral_record 
        FROM public.referrals 
        WHERE referred_user_id = NEW.tenant_id 
        AND status = 'registered';
        
        IF FOUND THEN
            -- Update referral status
            UPDATE public.referrals 
            SET approved_at = now(),
                status = 'approved',
                property_id = NEW.property_id,
                updated_at = now()
            WHERE id = referral_record.id;
            
            -- Create tracking event
            INSERT INTO public.referral_tracking_events (
                referral_id,
                event_type,
                metadata
            ) VALUES (
                referral_record.id,
                'application_approved',
                jsonb_build_object(
                    'property_id', NEW.property_id,
                    'tenant_id', NEW.tenant_id,
                    'approved_at', now()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for application approval
DROP TRIGGER IF EXISTS on_application_approved_referral ON public.property_applications;
CREATE TRIGGER on_application_approved_referral
    AFTER UPDATE ON public.property_applications
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_application_approval_referral();

-- Create function to track first payment
CREATE OR REPLACE FUNCTION public.handle_first_payment_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    referral_record RECORD;
    is_first_payment BOOLEAN;
BEGIN
    -- Only process successful payments
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Check if this is the tenant's first successful payment
        SELECT NOT EXISTS(
            SELECT 1 FROM public.rent_payments 
            WHERE tenant_id = NEW.tenant_id 
            AND status = 'completed' 
            AND id != NEW.id
        ) INTO is_first_payment;
        
        IF is_first_payment THEN
            -- Find referral for this tenant
            SELECT * INTO referral_record 
            FROM public.referrals 
            WHERE referred_user_id = NEW.tenant_id 
            AND status = 'approved';
            
            IF FOUND THEN
                -- Update referral status
                UPDATE public.referrals 
                SET first_payment_at = now(),
                    status = 'first_payment',
                    updated_at = now()
                WHERE id = referral_record.id;
                
                -- Create tracking event
                INSERT INTO public.referral_tracking_events (
                    referral_id,
                    event_type,
                    metadata
                ) VALUES (
                    referral_record.id,
                    'first_payment',
                    jsonb_build_object(
                        'payment_id', NEW.id,
                        'amount', NEW.amount,
                        'payment_date', NEW.payment_date
                    )
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for first payment
DROP TRIGGER IF EXISTS on_first_payment_referral ON public.rent_payments;
CREATE TRIGGER on_first_payment_referral
    AFTER UPDATE ON public.rent_payments
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_first_payment_referral();

-- Create function to check for 60-day milestone
CREATE OR REPLACE FUNCTION public.check_sixty_day_milestone()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    referral_record RECORD;
BEGIN
    -- Find referrals that have made first payment and are due for 60-day check
    FOR referral_record IN 
        SELECT * FROM public.referrals 
        WHERE status = 'first_payment' 
        AND first_payment_at IS NOT NULL 
        AND first_payment_at <= (now() - INTERVAL '60 days')
    LOOP
        -- Update to qualified status
        UPDATE public.referrals 
        SET sixty_day_milestone_at = now(),
            status = 'qualified',
            updated_at = now()
        WHERE id = referral_record.id;
        
        -- Create tracking event
        INSERT INTO public.referral_tracking_events (
            referral_id,
            event_type,
            metadata
        ) VALUES (
            referral_record.id,
            '60_day_milestone',
            jsonb_build_object(
                'milestone_reached_at', now(),
                'first_payment_date', referral_record.first_payment_at
            )
        );
        
        -- Award $100 gift card
        INSERT INTO public.referral_rewards (
            user_id, 
            referral_id, 
            reward_type, 
            reward_amount, 
            reward_description, 
            status
        ) VALUES (
            referral_record.referrer_id,
            referral_record.id,
            'gift_card',
            100.00,
            '$100 Gift Card for Successful 60-Day Referral',
            'available'
        );
        
        -- Check for milestone bonus (5 qualified referrals)
        IF (SELECT COUNT(*) FROM public.referrals 
            WHERE referrer_id = referral_record.referrer_id 
            AND status = 'qualified') = 5 THEN
            
            INSERT INTO public.referral_rewards (
                user_id, 
                referral_id, 
                reward_type, 
                reward_amount, 
                reward_description, 
                status
            ) VALUES (
                referral_record.referrer_id,
                NULL,
                'milestone_bonus',
                250.00,
                '$250 Milestone Bonus for 5 Successful Referrals',
                'available'
            );
        END IF;
    END LOOP;
END;
$function$;