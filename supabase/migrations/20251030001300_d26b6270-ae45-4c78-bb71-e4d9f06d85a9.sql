-- Add mock data for registered and qualified referrals
-- This script updates existing referrals to show different statuses for testing

-- Update 2 referrals to 'registered' status
UPDATE referrals 
SET status = 'registered', 
    updated_at = now() - INTERVAL '5 days'
WHERE id IN (
  SELECT id FROM referrals 
  WHERE referrer_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
    AND status = 'invitation_sent'
  ORDER BY created_at DESC
  LIMIT 2
);

-- Add 'user_registered' tracking events for these registered referrals
INSERT INTO referral_tracking_events (referral_id, event_type, event_timestamp, created_at)
SELECT 
  id, 
  'user_registered', 
  now() - INTERVAL '5 days',
  now() - INTERVAL '5 days'
FROM referrals
WHERE referrer_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
  AND status = 'registered';

-- Update 1 referral to 'qualified' status
UPDATE referrals 
SET status = 'qualified', 
    updated_at = now() - INTERVAL '2 days',
    first_payment_at = now() - INTERVAL '2 days'
WHERE id IN (
  SELECT id FROM referrals 
  WHERE referrer_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
    AND status = 'invitation_sent'
  ORDER BY created_at DESC
  LIMIT 1
);

-- Add 'application_approved' tracking event for qualified referral
INSERT INTO referral_tracking_events (referral_id, event_type, event_timestamp, created_at)
SELECT 
  id, 
  'application_approved', 
  now() - INTERVAL '3 days',
  now() - INTERVAL '3 days'
FROM referrals
WHERE referrer_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
  AND status = 'qualified';

-- Add 'first_payment' tracking event for qualified referral
INSERT INTO referral_tracking_events (referral_id, event_type, event_timestamp, created_at)
SELECT 
  id, 
  'first_payment', 
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days'
FROM referrals
WHERE referrer_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
  AND status = 'qualified';