
-- 1. Extend status enums with missing/new labels (idempotent)
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'engaged';
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'procurement';
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'signed';
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE agency_lead_status ADD VALUE IF NOT EXISTS 'dormant';

ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'engaged';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'demo_scheduled';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'procurement';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'agreement';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'signed';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'live';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE prospect_status ADD VALUE IF NOT EXISTS 'lost';
