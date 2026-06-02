-- Add test data for completed maintenance tasks with vendor assignments and costs

-- First, let's create additional maintenance vendors for testing
INSERT INTO public.maintenance_vendors (id, name, specialty, contact_phone, contact_email, hourly_rate, portfolio_id, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'ABC Plumbing Services', 'plumbing', '555-0123', 'contact@abcplumbing.com', 85.00, (SELECT id FROM portfolios WHERE name = 'Main Portfolio' LIMIT 1), true, now(), now()),
  (gen_random_uuid(), 'Elite Electrical', 'electrical', '555-0456', 'info@eliteelectrical.com', 95.00, (SELECT id FROM portfolios WHERE name = 'Main Portfolio' LIMIT 1), true, now(), now()),
  (gen_random_uuid(), 'General Maintenance Pro', 'general_maintenance', '555-0789', 'service@gmpro.com', 65.00, (SELECT id FROM portfolios WHERE name = 'Main Portfolio' LIMIT 1), true, now(), now());

-- Update existing completed maintenance requests to have vendor assignments and costs
WITH existing_vendors AS (
  SELECT id, specialty FROM public.maintenance_vendors WHERE is_active = true
),
completed_requests AS (
  SELECT id, category FROM public.maintenance_requests WHERE status = 'completed'
)
UPDATE public.maintenance_requests 
SET 
  assigned_vendor_id = (
    SELECT ev.id 
    FROM existing_vendors ev 
    WHERE (
      (ev.specialty = 'hvac' AND cr.category = 'hvac') OR
      (ev.specialty = 'plumbing' AND cr.category = 'plumbing') OR
      (ev.specialty = 'electrical' AND cr.category = 'electrical') OR
      (ev.specialty = 'general_maintenance' AND cr.category NOT IN ('hvac', 'plumbing', 'electrical'))
    )
    LIMIT 1
  ),
  estimated_cost = 
    CASE 
      WHEN category = 'hvac' THEN (random() * 800 + 200)::numeric(10,2)
      WHEN category = 'plumbing' THEN (random() * 600 + 150)::numeric(10,2)
      WHEN category = 'electrical' THEN (random() * 500 + 100)::numeric(10,2)
      ELSE (random() * 400 + 80)::numeric(10,2)
    END,
  actual_cost = 
    CASE 
      WHEN category = 'hvac' THEN (random() * 850 + 180)::numeric(10,2)
      WHEN category = 'plumbing' THEN (random() * 650 + 130)::numeric(10,2)
      WHEN category = 'electrical' THEN (random() * 550 + 90)::numeric(10,2)
      ELSE (random() * 450 + 70)::numeric(10,2)
    END,
  updated_at = now()
FROM completed_requests cr
WHERE maintenance_requests.id = cr.id;

-- Insert new completed maintenance requests with varied data
INSERT INTO public.maintenance_requests (
  id, property_id, title, description, category, priority, status, 
  estimated_cost, actual_cost, assigned_vendor_id, 
  created_at, completed_date, updated_at
) VALUES
  -- HVAC tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1), 
   'Air Conditioning Repair', 
   'AC unit not cooling properly, needs refrigerant refill and coil cleaning', 
   'hvac', 'high', 'completed', 
   450.00, 485.00,
   (SELECT id FROM maintenance_vendors WHERE specialty = 'hvac' LIMIT 1),
   now() - interval '25 days', now() - interval '23 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() OFFSET 1 LIMIT 1), 
   'Furnace Filter Replacement', 
   'Monthly furnace filter replacement and system inspection', 
   'hvac', 'medium', 'completed', 
   120.00, 95.00,
   (SELECT id FROM maintenance_vendors WHERE specialty = 'hvac' LIMIT 1),
   now() - interval '15 days', now() - interval '14 days', now()),

  -- Plumbing tasks  
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1), 
   'Kitchen Sink Leak Repair', 
   'Leaking faucet in kitchen sink, needs new gaskets and valve repair', 
   'plumbing', 'medium', 'completed', 
   180.00, 165.00,
   (SELECT id FROM maintenance_vendors WHERE name = 'ABC Plumbing Services' LIMIT 1),
   now() - interval '35 days', now() - interval '33 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() OFFSET 1 LIMIT 1), 
   'Toilet Installation', 
   'Replace old toilet with new water-efficient model', 
   'plumbing', 'high', 'completed', 
   350.00, 385.00,
   (SELECT id FROM maintenance_vendors WHERE name = 'ABC Plumbing Services' LIMIT 1),
   now() - interval '45 days', now() - interval '43 days', now()),

  -- Electrical tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1), 
   'Outlet Replacement', 
   'Replace old outlets with GFCI outlets in bathroom and kitchen', 
   'electrical', 'medium', 'completed', 
   280.00, 295.00,
   (SELECT id FROM maintenance_vendors WHERE name = 'Elite Electrical' LIMIT 1),
   now() - interval '20 days', now() - interval '18 days', now()),
   
  -- General maintenance tasks
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() OFFSET 1 LIMIT 1), 
   'Interior Painting', 
   'Paint living room and bedroom walls, touch up trim work', 
   'general_maintenance', 'low', 'completed', 
   600.00, 575.00,
   (SELECT id FROM maintenance_vendors WHERE name = 'General Maintenance Pro' LIMIT 1),
   now() - interval '60 days', now() - interval '57 days', now()),
   
  (gen_random_uuid(), 
   (SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1), 
   'Door Lock Replacement', 
   'Replace front door lock with smart lock system', 
   'security', 'medium', 'completed', 
   250.00, 275.00,
   (SELECT id FROM maintenance_vendors WHERE name = 'General Maintenance Pro' LIMIT 1),
   now() - interval '10 days', now() - interval '8 days', now());