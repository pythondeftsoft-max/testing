-- Phase 1: Add lifecycle columns to marketplace_applications
ALTER TABLE marketplace_applications
ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'applicant',
ADD COLUMN IF NOT EXISTS became_tenant_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS moved_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lease_start_date DATE,
ADD COLUMN IF NOT EXISTS lease_end_date DATE,
ADD COLUMN IF NOT EXISTS lease_document_url TEXT,
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS priority_payment_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS move_in_checklist JSONB,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_match_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal';

-- Sync data from property_applications to marketplace_applications (only existing columns)
UPDATE marketplace_applications ma
SET 
  lifecycle_stage = CASE 
    WHEN pa.status = 'approved' THEN 'tenant'
    WHEN pa.status = 'rejected' THEN 'rejected'
    WHEN pa.status = 'withdrawn' THEN 'withdrawn'
    ELSE 'applicant'
  END,
  assigned_worker_id = pa.assigned_worker_id,
  priority_payment_made = COALESCE(pa.priority_payment_made, false),
  move_in_date = pa.move_in_date,
  move_in_checklist = pa.move_in_checklist,
  rejection_reason = pa.rejection_reason,
  ai_match_score = pa.ai_match_score,
  priority_level = COALESCE(pa.priority_level, 'normal')
FROM property_applications pa
WHERE ma.id = pa.marketplace_application_id
  AND pa.marketplace_application_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_lifecycle 
ON marketplace_applications(lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_user_property 
ON marketplace_applications(user_id, property_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_assigned_worker 
ON marketplace_applications(assigned_worker_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_created 
ON marketplace_applications(created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN marketplace_applications.lifecycle_stage IS 'Current lifecycle stage: applicant, tenant, rejected, withdrawn';