-- Add approval workflow fields to white_label_configs
ALTER TABLE white_label_configs 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS domain_verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS domain_verification_token TEXT;

-- Create domain_verifications table
CREATE TABLE IF NOT EXISTS domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_config_id UUID REFERENCES white_label_configs(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verification_method TEXT DEFAULT 'dns_txt',
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  verification_status TEXT DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on domain_verifications
ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for domain_verifications
CREATE POLICY "Users can manage their own domain verifications" ON domain_verifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = domain_verifications.white_label_config_id 
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all domain verifications" ON domain_verifications
FOR SELECT USING (is_admin(auth.uid()));

-- Create white_label_approval_requests table for tracking approval workflow
CREATE TABLE IF NOT EXISTS white_label_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_config_id UUID REFERENCES white_label_configs(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  review_notes TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on approval requests
ALTER TABLE white_label_approval_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for approval requests
CREATE POLICY "Users can view their own approval requests" ON white_label_approval_requests
FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Users can create approval requests" ON white_label_approval_requests
FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can manage all approval requests" ON white_label_approval_requests
FOR ALL USING (is_admin(auth.uid()));

-- Create function to update domain verification status
CREATE OR REPLACE FUNCTION update_domain_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for domain verifications
CREATE TRIGGER update_domain_verifications_updated_at
  BEFORE UPDATE ON domain_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_verification_status();

-- Create trigger for approval requests  
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON white_label_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_verification_status();