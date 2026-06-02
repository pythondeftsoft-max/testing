-- Add test data for completed maintenance tasks with vendor assignments and costs

-- First, let's create additional maintenance vendors for testing
INSERT INTO public.maintenance_vendors (
  id, company_name, contact_name, phone, email, specialties, 
  hourly_rate, portfolio_id, is_active, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'ABC Plumbing Services', 'Mike Rodriguez', '555-0123', 'contact@abcplumbing.com', 
   ARRAY['plumbing']::maintenance_specialty[], 85.00, 
   (SELECT id FROM portfolios WHERE manager_id = auth.uid() LIMIT 1), true, now(), now()),
  (gen_random_uuid(), 'Elite Electrical', 'Sarah Johnson', '555-0456', 'info@eliteelectrical.com', 
   ARRAY['electrical']::maintenance_specialty[], 95.00, 
   (SELECT id FROM portfolios WHERE manager_id = auth.uid() LIMIT 1), true, now(), now()),
  (gen_random_uuid(), 'General Maintenance Pro', 'Tom Wilson', '555-0789', 'service@gmpro.com', 
   ARRAY['general_handyman']::maintenance_specialty[], 65.00, 
   (SELECT id FROM portfolios WHERE manager_id = auth.uid() LIMIT 1), true, now(), now());

-- Update existing completed maintenance requests to have vendor assignments and costs
UPDATE public.maintenance_requests 
SET 
  assigned_vendor_id = CASE 
    WHEN category = 'hvac' OR title ILIKE '%fridge%' OR title ILIKE '%heating%' OR title ILIKE '%cooling%' THEN 
      (SELECT id FROM maintenance_vendors WHERE 'hvac' = ANY(specialties) LIMIT 1)
    WHEN category = 'plumbing' OR title ILIKE '%leak%' OR title ILIKE '%shower%' OR title ILIKE '%faucet%' THEN 
      (SELECT id FROM maintenance_vendors WHERE 'plumbing' = ANY(specialties) LIMIT 1)
    WHEN category = 'electrical' THEN 
      (SELECT id FROM maintenance_vendors WHERE 'electrical' = ANY(specialties) LIMIT 1)
    ELSE 
      (SELECT id FROM maintenance_vendors WHERE 'general_handyman' = ANY(specialties) LIMIT 1)
  END,
  estimated_cost = 
    CASE 
      WHEN title ILIKE '%fridge%' THEN 350.00
      WHEN title ILIKE '%shower%' THEN 275.00
      WHEN title ILIKE '%leak%' OR title ILIKE '%faucet%' THEN 150.00
      ELSE (random() * 300 + 100)::numeric(10,2)
    END,
  actual_cost = 
    CASE 
      WHEN title ILIKE '%fridge%' THEN 385.00
      WHEN title ILIKE '%shower%' THEN 295.00
      WHEN title ILIKE '%leak%' OR title ILIKE '%faucet%' THEN 135.00
      ELSE (random() * 320 + 90)::numeric(10,2)
    END,
  updated_at = now()
WHERE status = 'completed' AND assigned_vendor_id IS NULL;

-- Insert new completed maintenance requests with varied data
INSERT INTO public.maintenance_requests (
  id, property_id, tenant_id, title, description, category, priority, status, 
  estimated_cost, actual_cost, assigned_vendor_id, 
  submitted_date, completed_date, created_at, updated_at
) VALUES
  -- HVAC tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Air Conditioning Repair', 
   'AC unit not cooling properly, needs refrigerant refill and coil cleaning', 
   'hvac', 'high', 'completed', 
   450.00, 485.00,
   (SELECT id FROM maintenance_vendors WHERE 'hvac' = ANY(specialties) LIMIT 1),
   now() - interval '25 days', now() - interval '23 days', now() - interval '25 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Furnace Filter Replacement', 
   'Monthly furnace filter replacement and system inspection', 
   'hvac', 'medium', 'completed', 
   120.00, 95.00,
   (SELECT id FROM maintenance_vendors WHERE 'hvac' = ANY(specialties) LIMIT 1),
   now() - interval '15 days', now() - interval '14 days', now() - interval '15 days', now()),

  -- Plumbing tasks  
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Kitchen Sink Leak Repair', 
   'Leaking faucet in kitchen sink, needs new gaskets and valve repair', 
   'plumbing', 'medium', 'completed', 
   180.00, 165.00,
   (SELECT id FROM maintenance_vendors WHERE 'plumbing' = ANY(specialties) LIMIT 1),
   now() - interval '35 days', now() - interval '33 days', now() - interval '35 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Toilet Installation', 
   'Replace old toilet with new water-efficient model', 
   'plumbing', 'high', 'completed', 
   350.00, 385.00,
   (SELECT id FROM maintenance_vendors WHERE 'plumbing' = ANY(specialties) LIMIT 1),
   now() - interval '45 days', now() - interval '43 days', now() - interval '45 days', now()),

  -- Electrical tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Outlet Replacement', 
   'Replace old outlets with GFCI outlets in bathroom and kitchen', 
   'electrical', 'medium', 'completed', 
   280.00, 295.00,
   (SELECT id FROM maintenance_vendors WHERE 'electrical' = ANY(specialties) LIMIT 1),
   now() - interval '20 days', now() - interval '18 days', now() - interval '20 days', now()),
   
  -- General maintenance tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Interior Painting', 
   'Paint living room and bedroom walls, touch up trim work', 
   'painting', 'low', 'completed', 
   600.00, 575.00,
   (SELECT id FROM maintenance_vendors WHERE 'general_handyman' = ANY(specialties) LIMIT 1),
   now() - interval '60 days', now() - interval '57 days', now() - interval '60 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1),
   (SELECT tenant_id FROM property_applications WHERE property_id = (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1) AND status = 'approved' LIMIT 1), 
   'Door Lock Replacement', 
   'Replace front door lock with smart lock system', 
   'security_systems', 'medium', 'completed', 
   250.00, 275.00,
   (SELECT id FROM maintenance_vendors WHERE 'general_handyman' = ANY(specialties) LIMIT 1),
   now() - interval '10 days', now() - interval '8 days', now() - interval '10 days', now());