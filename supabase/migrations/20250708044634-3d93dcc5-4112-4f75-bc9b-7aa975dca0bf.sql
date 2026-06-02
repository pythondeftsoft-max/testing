-- Add diverse messages for the new applications
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  pa.tenant_id,
  CASE 
    WHEN p.address LIKE '%Urban Loft%' THEN 'I absolutely love the exposed brick and modern finishes in this loft! The location is perfect for my work downtown. When could we schedule a viewing?'
    WHEN p.address LIKE '%Maple Grove%' THEN 'This family home looks perfect for us! The backyard and school district are exactly what we need. We have excellent references and stable income.'
    WHEN p.address LIKE '%Victorian%' THEN 'The historic charm of this property is amazing! I love the high ceilings and hardwood floors. I have been looking for something with character like this.'
    WHEN p.address LIKE '%Community Way%' THEN 'I am very interested in this Section 8 approved property. I have my voucher ready and excellent rental history. The yard space would be great for my children.'
    WHEN p.address LIKE '%Studio Plaza%' THEN 'This modern studio is exactly what I need! The building amenities are impressive. I work remotely so the location is perfect.'
    ELSE 'I am very interested in this property and would love to schedule a viewing at your earliest convenience.'
  END,
  true,
  pa.created_at + interval '30 minutes'
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.created_at > now() - interval '4 days'
ON CONFLICT DO NOTHING;

-- Add landlord responses to some of the messages
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  'ccb8536c-80d1-4834-9614-169b9a7caede', -- landlord ID
  CASE 
    WHEN pa.status = 'approved' THEN 'Congratulations! Your application has been approved. I will send over the lease documents shortly. Welcome to your new home!'
    WHEN pa.status = 'pending' AND pa.priority_payment_made THEN 'Thank you for your priority application! I am reviewing all applications and will get back to you within 24 hours. Would you like to schedule a virtual tour in the meantime?'
    WHEN pa.status = 'pending' THEN 'Thank you for your interest! I have received several applications and am reviewing them all. I will be in touch soon with next steps.'
    ELSE 'Thank you for your application. Unfortunately, we have decided to go with another candidate at this time.'
  END,
  false,
  pa.created_at + interval '4 hours' + (random() * interval '6 hours')
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.created_at > now() - interval '4 days'
  AND random() > 0.3 -- Only respond to 70% of messages to make it realistic
ON CONFLICT DO NOTHING;

-- Add some follow-up tenant messages
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  pa.id,
  pa.tenant_id,
  CASE 
    WHEN pa.status = 'approved' THEN 'Thank you so much! I am so excited. When can I pick up the keys? I can provide first month rent and security deposit immediately.'
    WHEN pa.status = 'pending' AND pa.priority_payment_made THEN 'Yes, I would love to schedule a virtual tour! I am available any time this week. Also, I can provide additional references if needed.'
    ELSE 'Thank you for the update! I am very interested and flexible with my move-in date. Please let me know if you need any additional information.'
  END,
  true,
  pa.created_at + interval '8 hours' + (random() * interval '12 hours')
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.created_at > now() - interval '4 days'
  AND random() > 0.5 -- Only half send follow-ups
ON CONFLICT DO NOTHING;