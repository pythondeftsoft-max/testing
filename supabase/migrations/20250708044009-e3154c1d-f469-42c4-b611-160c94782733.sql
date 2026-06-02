-- Add test property applications for the existing demo tenant
-- First, let's check if the demo tenant exists and create some applications

-- Insert test property applications for demo tenant if they don't exist
INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- demo tenant ID
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 1 THEN 'pending'
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 2 THEN 'approved'  
    ELSE 'pending'
  END as status,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) <= 2 THEN true
    ELSE false
  END as priority_payment_made,
  15.00,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 1 THEN 8
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 2 THEN 9
    ELSE 7
  END as tenant_score
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
LIMIT 3
ON CONFLICT (tenant_id, property_id) DO NOTHING;

-- Insert test messages for the applications
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- demo tenant ID
  CASE ROW_NUMBER() OVER (ORDER BY pa.created_at)
    WHEN 1 THEN 'Hi! I am very interested in this property. I have a Section 8 voucher and excellent references. Could we schedule a viewing?'
    WHEN 2 THEN 'Hello, I would love to apply for this property. I meet all the income requirements and can provide documentation. When would be a good time to see it?'
    ELSE 'Good afternoon! This property looks perfect for my family. I have been pre-approved for my voucher and am ready to move in. Please let me know if it is still available.'
  END,
  true,
  now() - interval '2 days' + (ROW_NUMBER() OVER (ORDER BY pa.created_at) * interval '6 hours')
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE pa.tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
ON CONFLICT DO NOTHING;

-- Add landlord responses
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  'ccb8536c-80d1-4834-9614-169b9a7caede', -- landlord ID
  CASE ROW_NUMBER() OVER (ORDER BY pa.created_at)
    WHEN 1 THEN 'Thank you for your interest! I would be happy to schedule a viewing. Are you available this weekend? I can also do virtual tours if preferred.'
    WHEN 2 THEN 'Hello! Thank you for applying. The property is still available. I can show it to you tomorrow evening or this weekend. What works best for you?'
    ELSE 'Hi there! Yes, the property is still available. Your application looks great. Would you like to schedule an interview to discuss the next steps?'
  END,
  false,
  now() - interval '1 day' + (ROW_NUMBER() OVER (ORDER BY pa.created_at) * interval '4 hours')
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE pa.tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
ON CONFLICT DO NOTHING;