-- Update passwords for the landlord test accounts to ensure they work properly
-- Using a more reliable password encryption method

-- Update landlord2@openkey.com (Rebecca Martinez) password
UPDATE auth.users 
SET encrypted_password = crypt('demo123', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmed_at = now(),
    updated_at = now()
WHERE email = 'landlord2@openkey.com';

-- Update landlord3@openkey.com (David Chen) password  
UPDATE auth.users 
SET encrypted_password = crypt('demo123', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmed_at = now(),
    updated_at = now()
WHERE email = 'landlord3@openkey.com';

-- Update landlord4@openkey.com (Amanda Foster) password
UPDATE auth.users 
SET encrypted_password = crypt('demo123', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmed_at = now(),
    updated_at = now()
WHERE email = 'landlord4@openkey.com';

-- Verify the accounts are properly set up
SELECT email, email_confirmed_at IS NOT NULL as email_confirmed, confirmed_at IS NOT NULL as account_confirmed 
FROM auth.users 
WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');