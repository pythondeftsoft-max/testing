
-- Step 1: Clean up the existing empty domain record to resolve unique constraint violation
UPDATE white_label_configs 
SET custom_domain = NULL, 
    custom_subdomain = NULL 
WHERE id = '4ea23c50-ddda-4573-b73a-8c403b53dbaa' 
  AND (custom_domain = '' OR custom_subdomain = '');

-- Step 2: Create the landlord4 white-label configuration
INSERT INTO white_label_configs (
    user_id,
    company_name,
    contact_email,
    contact_phone,
    custom_domain,
    primary_color,
    secondary_color,
    accent_color,
    theme_preset,
    is_active,
    domain_verification_token,
    domain_verification_status
) VALUES (
    '50a0100f-7fc2-46ca-8335-dd6ed2512d56',
    'Foster Investment Group',
    'landlord4@openkey.com',
    '555-0401',
    'openkeyhousing.com',
    '#2563eb',
    '#1e40af',
    '#3b82f6',
    'professional',
    true,
    'wl-verify-' || substr(gen_random_uuid()::text, 1, 20),
    'pending'
);

-- Create a domain verification record for openkeyhousing.com
INSERT INTO domain_verifications (
    white_label_config_id,
    domain,
    verification_token,
    verification_status,
    verification_method
) 
SELECT 
    wlc.id,
    'openkeyhousing.com',
    wlc.domain_verification_token,
    'pending',
    'dns_txt'
FROM white_label_configs wlc
WHERE wlc.user_id = '50a0100f-7fc2-46ca-8335-dd6ed2512d56'
  AND wlc.custom_domain = 'openkeyhousing.com';
