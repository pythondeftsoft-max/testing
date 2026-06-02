-- Phase 1: Database Schema Updates

-- Update tenant_profiles table to support new quota system
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS free_applications_remaining INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_application_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS messages_since_last_response INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_initiate_messaging BOOLEAN NOT NULL DEFAULT TRUE;

-- Update message_limits table to better track conversation state
ALTER TABLE public.message_limits 
ADD COLUMN IF NOT EXISTS conversation_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Create application quota tracking function
CREATE OR REPLACE FUNCTION public.check_application_quota(tenant_id UUID)
RETURNS TABLE(can_apply BOOLEAN, remaining_applications INTEGER, is_subscriber BOOLEAN)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  days_since_reset INTEGER;
BEGIN
  -- Get tenant profile and subscription status
  SELECT tp.*, p.subscription_active
  INTO profile_record
  FROM public.tenant_profiles tp
  JOIN public.profiles p ON tp.user_id = p.id
  WHERE tp.user_id = tenant_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, FALSE;
    RETURN;
  END IF;
  
  -- Check if subscription bypasses quotas
  IF profile_record.subscription_active = TRUE THEN
    RETURN QUERY SELECT TRUE, 999, TRUE;
    RETURN;
  END IF;
  
  -- Check if quota needs reset (7 days)
  days_since_reset := EXTRACT(DAY FROM NOW() - profile_record.last_application_reset);
  
  IF days_since_reset >= 7 THEN
    -- Reset quota
    UPDATE public.tenant_profiles 
    SET free_applications_remaining = 5,
        last_application_reset = NOW()
    WHERE user_id = tenant_id;
    
    RETURN QUERY SELECT TRUE, 5, FALSE;
    RETURN;
  END IF;
  
  -- Return current quota status
  RETURN QUERY SELECT 
    (profile_record.free_applications_remaining > 0),
    profile_record.free_applications_remaining,
    FALSE;
END;
$$;

-- Create function to consume application quota
CREATE OR REPLACE FUNCTION public.consume_application_quota(tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quota_check RECORD;
BEGIN
  -- Check current quota
  SELECT * INTO quota_check 
  FROM public.check_application_quota(tenant_id);
  
  IF NOT quota_check.can_apply THEN
    RETURN FALSE;
  END IF;
  
  -- Don't decrement for subscribers
  IF quota_check.is_subscriber THEN
    RETURN TRUE;
  END IF;
  
  -- Decrement quota
  UPDATE public.tenant_profiles 
  SET free_applications_remaining = free_applications_remaining - 1
  WHERE user_id = tenant_id;
  
  RETURN TRUE;
END;
$$;

-- Create function to check messaging quota
CREATE OR REPLACE FUNCTION public.check_messaging_quota(tenant_id UUID, application_id UUID)
RETURNS TABLE(can_message BOOLEAN, messages_remaining INTEGER, reason TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  limit_record RECORD;
  has_landlord_responded BOOLEAN := FALSE;
  message_count INTEGER := 0;
BEGIN
  -- Get message limit record
  SELECT * INTO limit_record
  FROM public.message_limits
  WHERE property_application_id = application_id AND message_limits.tenant_id = check_messaging_quota.tenant_id;
  
  -- Create record if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.message_limits (property_application_id, tenant_id, messages_sent, landlord_has_responded)
    VALUES (application_id, tenant_id, 0, FALSE);
    
    SELECT * INTO limit_record
    FROM public.message_limits
    WHERE property_application_id = application_id AND message_limits.tenant_id = check_messaging_quota.tenant_id;
  END IF;
  
  -- Check if landlord has responded
  has_landlord_responded := limit_record.landlord_has_responded;
  message_count := limit_record.messages_sent;
  
  -- Rule 1: Tenant cannot message until landlord responds (after application)
  IF NOT has_landlord_responded THEN
    RETURN QUERY SELECT FALSE, 0, 'Cannot send messages until landlord responds to your application';
    RETURN;
  END IF;
  
  -- Rule 2: Cannot send more than 4 messages without landlord response
  IF message_count >= 4 THEN
    RETURN QUERY SELECT FALSE, 0, 'Cannot send more than 4 messages without landlord response';
    RETURN;
  END IF;
  
  -- Can message
  RETURN QUERY SELECT TRUE, (4 - message_count), 'OK';
END;
$$;

-- Create function to handle message sending with quota enforcement
CREATE OR REPLACE FUNCTION public.send_tenant_message(
  tenant_id UUID,
  application_id UUID,
  message_text TEXT
)
RETURNS TABLE(success BOOLEAN, message_id UUID, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quota_check RECORD;
  new_message_id UUID;
BEGIN
  -- Check messaging quota
  SELECT * INTO quota_check
  FROM public.check_messaging_quota(tenant_id, application_id);
  
  IF NOT quota_check.can_message THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, quota_check.reason;
    RETURN;
  END IF;
  
  -- Insert message
  INSERT INTO public.messages (sender_id, property_application_id, message_text, created_by_tenant)
  VALUES (tenant_id, application_id, message_text, TRUE)
  RETURNING id INTO new_message_id;
  
  -- Update message count
  UPDATE public.message_limits
  SET messages_sent = messages_sent + 1,
      last_message_sent_at = NOW()
  WHERE property_application_id = application_id AND message_limits.tenant_id = send_tenant_message.tenant_id;
  
  RETURN QUERY SELECT TRUE, new_message_id, 'Message sent successfully';
END;
$$;

-- Create function to reset message quota when landlord responds
CREATE OR REPLACE FUNCTION public.handle_landlord_message_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is a landlord message (not created by tenant)
  IF NEW.created_by_tenant = FALSE THEN
    -- Reset message count and mark landlord as responded
    UPDATE public.message_limits
    SET messages_sent = 0,
        landlord_has_responded = TRUE
    WHERE property_application_id = NEW.property_application_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for landlord message responses
DROP TRIGGER IF EXISTS landlord_message_response_trigger ON public.messages;
CREATE TRIGGER landlord_message_response_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_landlord_message_response();

-- Create function for weekly quota reset (to be called by edge function)
CREATE OR REPLACE FUNCTION public.reset_weekly_application_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Reset quotas for all tenants whose last reset was more than 7 days ago
  UPDATE public.tenant_profiles
  SET free_applications_remaining = 5,
      last_application_reset = NOW()
  WHERE EXTRACT(DAY FROM NOW() - last_application_reset) >= 7;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$;