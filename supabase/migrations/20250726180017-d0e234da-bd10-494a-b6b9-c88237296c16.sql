-- Add additional columns to domain_verifications table for better management
ALTER TABLE domain_verifications 
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS needs_reverification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reset_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reset_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on frequent queries
CREATE INDEX IF NOT EXISTS idx_domain_verifications_last_checked ON domain_verifications(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_needs_reverification ON domain_verifications(needs_reverification);

-- Create audit trail table for domain verification actions
CREATE TABLE IF NOT EXISTS domain_verification_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_verification_id UUID REFERENCES domain_verifications(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('reset', 'reverify', 'verify', 'create')),
    performed_by UUID REFERENCES auth.users(id),
    old_status TEXT,
    new_status TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE domain_verification_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit table
CREATE POLICY "Config owners can view audit logs for their domains"
ON domain_verification_audit FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM domain_verifications dv
        JOIN white_label_configs wlc ON dv.white_label_config_id = wlc.id
        WHERE dv.id = domain_verification_audit.domain_verification_id
        AND wlc.user_id = auth.uid()
    )
);

CREATE POLICY "System can insert audit logs"
ON domain_verification_audit FOR INSERT
WITH CHECK (true);

-- Add trigger to automatically create audit entries
CREATE OR REPLACE FUNCTION create_domain_verification_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit record for significant changes
    IF TG_OP = 'UPDATE' AND (
        OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
        OLD.verification_token IS DISTINCT FROM NEW.verification_token
    ) THEN
        INSERT INTO domain_verification_audit (
            domain_verification_id,
            action_type,
            old_status,
            new_status,
            metadata
        ) VALUES (
            NEW.id,
            CASE 
                WHEN OLD.verification_token IS DISTINCT FROM NEW.verification_token THEN 'reset'
                ELSE 'verify'
            END,
            OLD.verification_status,
            NEW.verification_status,
            jsonb_build_object(
                'old_token', CASE WHEN OLD.verification_token IS DISTINCT FROM NEW.verification_token THEN '[REDACTED]' ELSE NULL END,
                'new_token', CASE WHEN OLD.verification_token IS DISTINCT FROM NEW.verification_token THEN '[REDACTED]' ELSE NULL END
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER domain_verification_audit_trigger
    AFTER UPDATE ON domain_verifications
    FOR EACH ROW
    EXECUTE FUNCTION create_domain_verification_audit();