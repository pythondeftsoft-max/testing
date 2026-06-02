-- Create an approved application for tenant@openkey.com for the $1200 property
INSERT INTO public.property_applications (
  tenant_id, 
  property_id, 
  status, 
  priority_payment_made
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'),
  '42e5d1ed-d300-4f3b-b604-11137fd2ea25',
  'approved',
  true
) ON CONFLICT (tenant_id, property_id) DO UPDATE SET
  status = 'approved',
  priority_payment_made = true;