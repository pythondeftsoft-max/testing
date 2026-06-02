
-- Tenant voucher status decoupled from signup
ALTER TABLE tenant_profiles ADD COLUMN platform_voucher_status text;

-- Agency requirements for tenant enrollment and porting
ALTER TABLE housing_authorities ADD COLUMN tenant_enrollment_requirements jsonb;
ALTER TABLE housing_authorities ADD COLUMN porting_requirements jsonb;

-- Onboarding flag
ALTER TABLE housing_authorities ADD COLUMN is_onboarded boolean DEFAULT false;

-- Auto-mark agencies with configured metadata as onboarded
UPDATE housing_authorities SET is_onboarded = true WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;
