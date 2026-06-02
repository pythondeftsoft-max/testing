
-- Add message limits and subscription tracking to tenant profiles
ALTER TABLE tenant_profiles 
ADD COLUMN message_credits INTEGER DEFAULT 2,
ADD COLUMN is_plus_subscriber BOOLEAN DEFAULT FALSE,
ADD COLUMN plus_subscription_expires_at TIMESTAMPTZ;

-- Add rate limiting and content moderation to messages
ALTER TABLE messages 
ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN flagged_reason TEXT,
ADD COLUMN created_by_tenant BOOLEAN DEFAULT TRUE;

-- Create a table to track message limits per property application
CREATE TABLE message_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id),
  property_application_id UUID NOT NULL REFERENCES property_applications(id),
  messages_sent INTEGER DEFAULT 0,
  last_message_sent_at TIMESTAMPTZ,
  landlord_has_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, property_application_id)
);

-- Enable RLS on message_limits
ALTER TABLE message_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_limits
CREATE POLICY "Tenants can view their own message limits" 
ON message_limits FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can update their own message limits" 
ON message_limits FOR ALL 
USING (tenant_id = auth.uid());

CREATE POLICY "Property owners can view limits for their properties" 
ON message_limits FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM property_applications pa
  JOIN properties p ON pa.property_id = p.id
  WHERE pa.id = message_limits.property_application_id 
  AND p.owner_id = auth.uid()
));

-- Create function to check and update message limits
CREATE OR REPLACE FUNCTION check_message_limit(
  p_tenant_id UUID,
  p_property_application_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_tenant_profile RECORD;
  v_message_limit RECORD;
  v_can_send BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Get tenant profile
  SELECT * INTO v_tenant_profile 
  FROM tenant_profiles 
  WHERE user_id = p_tenant_id;
  
  -- Get or create message limit record
  INSERT INTO message_limits (tenant_id, property_application_id)
  VALUES (p_tenant_id, p_property_application_id)
  ON CONFLICT (tenant_id, property_application_id) DO NOTHING;
  
  SELECT * INTO v_message_limit 
  FROM message_limits 
  WHERE tenant_id = p_tenant_id 
  AND property_application_id = p_property_application_id;
  
  -- Check if tenant is plus subscriber
  IF v_tenant_profile.is_plus_subscriber AND 
     (v_tenant_profile.plus_subscription_expires_at IS NULL OR 
      v_tenant_profile.plus_subscription_expires_at > now()) THEN
    v_can_send := TRUE;
    v_reason := 'Plus subscriber - unlimited messages';
  -- Check if landlord has responded (allows unlimited back-and-forth)
  ELSIF v_message_limit.landlord_has_responded THEN
    v_can_send := TRUE;
    v_reason := 'Landlord has responded - conversation active';
  -- Check message credits
  ELSIF v_tenant_profile.message_credits > 0 AND v_message_limit.messages_sent < 2 THEN
    v_can_send := TRUE;
    v_reason := 'Within free message limit';
  ELSE
    v_can_send := FALSE;
    v_reason := 'Message limit reached - upgrade to Plus for unlimited messages';
  END IF;
  
  RETURN jsonb_build_object(
    'can_send', v_can_send,
    'reason', v_reason,
    'messages_sent', v_message_limit.messages_sent,
    'credits_remaining', v_tenant_profile.message_credits,
    'is_plus_subscriber', v_tenant_profile.is_plus_subscriber,
    'landlord_responded', v_message_limit.landlord_has_responded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update message counts after sending
CREATE OR REPLACE FUNCTION update_message_count(
  p_tenant_id UUID,
  p_property_application_id UUID,
  p_is_from_tenant BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
  IF p_is_from_tenant THEN
    -- Update tenant message count and credits
    UPDATE message_limits 
    SET messages_sent = messages_sent + 1,
        last_message_sent_at = now(),
        updated_at = now()
    WHERE tenant_id = p_tenant_id 
    AND property_application_id = p_property_application_id;
    
    -- Deduct credit if not plus subscriber and within initial limit
    UPDATE tenant_profiles 
    SET message_credits = GREATEST(message_credits - 1, 0)
    WHERE user_id = p_tenant_id 
    AND NOT is_plus_subscriber 
    AND message_credits > 0;
  ELSE
    -- Mark that landlord has responded
    UPDATE message_limits 
    SET landlord_has_responded = TRUE,
        updated_at = now()
    WHERE tenant_id = p_tenant_id 
    AND property_application_id = p_property_application_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add content moderation trigger
CREATE OR REPLACE FUNCTION moderate_message_content() 
RETURNS TRIGGER AS $$
DECLARE
  v_flagged_words TEXT[] := ARRAY['spam', 'scam', 'urgent', 'money transfer', 'wire transfer', 'cash only'];
  v_word TEXT;
BEGIN
  -- Simple content moderation
  FOREACH v_word IN ARRAY v_flagged_words LOOP
    IF LOWER(NEW.message_text) LIKE '%' || v_word || '%' THEN
      NEW.is_flagged := TRUE;
      NEW.flagged_reason := 'Contains potentially suspicious content: ' || v_word;
      EXIT;
    END IF;
  END LOOP;
  
  -- Character limit check
  IF LENGTH(NEW.message_text) > 2000 THEN
    RAISE EXCEPTION 'Message too long. Maximum 2000 characters allowed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moderate_message_before_insert
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION moderate_message_content();
