-- Create an approved property application for the test user
INSERT INTO public.property_applications (
  tenant_id, 
  property_id, 
  status, 
  priority_payment_made,
  tenant_score
)
SELECT 
  'f9700b24-4fc2-4b72-8479-409c5d64b586'::uuid as tenant_id,
  p.id as property_id,
  'approved' as status,
  true as priority_payment_made,
  8 as tenant_score
FROM public.properties p
WHERE p.deleted_at IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;