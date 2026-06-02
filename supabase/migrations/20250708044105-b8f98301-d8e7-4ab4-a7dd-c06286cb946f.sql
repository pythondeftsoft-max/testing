-- Add test property applications for existing tenants
INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  'eb292509-b618-43b3-869c-0abedd81a26b', -- Nick Tahal
  p.id,
  'pending',
  true,
  15.00,
  8
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
LIMIT 1
ON CONFLICT (tenant_id, property_id) DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', -- Logan Test
  p.id,
  'approved',
  true,
  15.00,
  9
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
OFFSET 1
LIMIT 1
ON CONFLICT (tenant_id, property_id) DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  'd2b76a2b-9804-430d-976f-eb38cdf8e917', -- Logan Testo
  p.id,
  'pending',
  false,
  15.00,
  7
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
OFFSET 2
LIMIT 1
ON CONFLICT (tenant_id, property_id) DO NOTHING;

-- Insert test messages for the applications
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  pa.tenant_id,
  'Hi! I am very interested in this property. I have excellent references and stable income. Could we schedule a viewing?',
  true,
  now() - interval '2 days'
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.tenant_id = 'eb292509-b618-43b3-869c-0abedd81a26b'
ON CONFLICT DO NOTHING;

INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  'ccb8536c-80d1-4834-9614-169b9a7caede', -- landlord ID
  'Thank you for your interest! I would be happy to schedule a viewing. Are you available this weekend?',
  false,
  now() - interval '1 day'
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.tenant_id = 'eb292509-b618-43b3-869c-0abedd81a26b'
ON CONFLICT DO NOTHING;

INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  pa.tenant_id,
  'Hello! I would love to apply for this property. I can provide all necessary documentation. When would be a good time to see it?',
  true,
  now() - interval '3 days'
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.tenant_id = '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6'
ON CONFLICT DO NOTHING;

INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  pa.tenant_id,
  'This property looks perfect for my needs. I have been pre-approved and am ready to move in soon. Please let me know availability.',
  true,
  now() - interval '1 day'
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.tenant_id = 'd2b76a2b-9804-430d-976f-eb38cdf8e917'
ON CONFLICT DO NOTHING;