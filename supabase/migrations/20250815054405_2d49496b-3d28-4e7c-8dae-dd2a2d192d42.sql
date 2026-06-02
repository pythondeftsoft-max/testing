-- Comprehensive seed data for full system testing

-- Insert sample portfolios
INSERT INTO public.portfolios (id, manager_id, client_name, client_email, client_phone, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Downtown Properties LLC', 'info@downtownprops.com', '555-0101', now() - interval '6 months'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Riverside Apartments Inc', 'contact@riverside.com', '555-0102', now() - interval '4 months')
ON CONFLICT (id) DO NOTHING;

-- Insert sample properties with realistic data
INSERT INTO public.properties (
  id, owner_id, portfolio_id, address, city, state, zip_code, property_type, 
  bedrooms, bathrooms, square_footage, monthly_rent, mortgage_cost, 
  insurance_cost, management_fee, repair_costs, purchase_price, 
  market_value, occupancy_status, on_market, status, lease_start_date, 
  lease_end_date, created_at
) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '123 Main St', 'New York', 'NY', '10001', 'apartment', 2, 1, 850, 2200, 1400, 150, 110, 200, 350000, 380000, 'occupied', false, 'occupied', now() - interval '8 months', now() + interval '4 months', now() - interval '1 year'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '456 Oak Ave', 'New York', 'NY', '10002', 'house', 3, 2, 1200, 3500, 2100, 200, 175, 350, 520000, 550000, 'occupied', false, 'occupied', now() - interval '6 months', now() + interval '6 months', now() - interval '10 months'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '789 Pine St', 'New York', 'NY', '10003', 'apartment', 1, 1, 600, 1800, 1000, 120, 90, 150, 280000, 290000, 'available', true, 'available', null, null, now() - interval '8 months'),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '321 Elm St', 'Brooklyn', 'NY', '11201', 'condo', 2, 2, 950, 2800, 1600, 180, 140, 250, 420000, 440000, 'occupied', false, 'occupied', now() - interval '5 months', now() + interval '7 months', now() - interval '9 months'),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '654 Cedar Ave', 'Brooklyn', 'NY', '11202', 'house', 4, 3, 1800, 4200, 2800, 250, 210, 400, 680000, 720000, 'available', true, 'available', null, null, now() - interval '6 months')
ON CONFLICT (id) DO NOTHING;

-- Insert tenant profiles
INSERT INTO public.profiles (id, first_name, last_name, email, phone, user_type, created_at) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'John', 'Smith', 'john.smith@email.com', '555-1001', 'tenant', now() - interval '8 months'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Sarah', 'Johnson', 'sarah.j@email.com', '555-1002', 'tenant', now() - interval '6 months'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Mike', 'Williams', 'mike.w@email.com', '555-1003', 'tenant', now() - interval '5 months'),
  ('770e8400-e29b-41d4-a716-446655440004', 'Lisa', 'Brown', 'lisa.brown@email.com', '555-1004', 'tenant', now() - interval '3 months')
ON CONFLICT (id) DO NOTHING;

-- Insert property applications
INSERT INTO public.property_applications (
  id, property_id, tenant_id, status, application_data, created_at
) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'approved', '{"income": 75000, "employment": "Software Engineer", "references": 3}', now() - interval '8 months'),
  ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'approved', '{"income": 95000, "employment": "Marketing Manager", "references": 2}', now() - interval '6 months'),
  ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 'approved', '{"income": 68000, "employment": "Teacher", "references": 3}', now() - interval '5 months')
ON CONFLICT (id) DO NOTHING;

-- Insert maintenance requests with realistic scenarios
INSERT INTO public.maintenance_requests (
  id, property_id, tenant_id, title, description, priority, status, 
  created_at, completed_date, category
) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Leaky kitchen faucet', 'Kitchen faucet drips constantly, needs repair', 'medium', 'completed', now() - interval '2 months', now() - interval '1 month 25 days', 'plumbing'),
  ('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'HVAC not heating', 'Heating system not working, apartment is cold', 'high', 'completed', now() - interval '3 months', now() - interval '2 months 28 days', 'hvac'),
  ('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Bathroom tile repair', 'Several tiles loose in bathroom shower', 'low', 'in_progress', now() - interval '2 weeks', null, 'general'),
  ('990e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 'Washing machine leak', 'Water leaking from washing machine connection', 'high', 'pending', now() - interval '3 days', null, 'plumbing'),
  ('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Window screen replacement', 'Living room window screen is torn', 'low', 'pending', now() - interval '1 week', null, 'general')
ON CONFLICT (id) DO NOTHING;

-- Insert rent payments with realistic payment patterns
INSERT INTO public.rent_payments (
  id, property_id, tenant_id, amount, due_date, payment_date, 
  status, payment_method, days_late, late_fee_amount, created_at
) VALUES
  -- John Smith payments (mostly on time)
  ('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 2200, '2024-01-01', '2024-01-01', 'completed', 'ach', 0, 0, '2024-01-01'),
  ('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 2200, '2024-02-01', '2024-02-03', 'completed', 'ach', 2, 50, '2024-02-03'),
  ('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 2200, '2024-03-01', '2024-03-01', 'completed', 'ach', 0, 0, '2024-03-01'),
  
  -- Sarah Johnson payments (some late)
  ('aa0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 3500, '2024-01-01', '2024-01-05', 'completed', 'check', 4, 75, '2024-01-05'),
  ('aa0e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 3500, '2024-02-01', '2024-02-08', 'completed', 'check', 7, 100, '2024-02-08'),
  ('aa0e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 3500, '2024-03-01', '2024-03-01', 'completed', 'ach', 0, 0, '2024-03-01'),
  
  -- Mike Williams payments (consistent)
  ('aa0e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 2800, '2024-01-01', '2024-01-01', 'completed', 'ach', 0, 0, '2024-01-01'),
  ('aa0e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 2800, '2024-02-01', '2024-01-31', 'completed', 'ach', 0, 0, '2024-01-31'),
  ('aa0e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 2800, '2024-03-01', '2024-03-01', 'completed', 'ach', 0, 0, '2024-03-01')
ON CONFLICT (id) DO NOTHING;

-- Insert AI insights cache with sample data
INSERT INTO public.ai_insights_cache (
  id, portfolio_id, landlord_id, analysis_type, insights_data, 
  expires_at, created_at
) VALUES
  ('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'comprehensive', 
   '{"portfolio_health": 85, "predictions": [{"type": "maintenance", "property_id": "660e8400-e29b-41d4-a716-446655440001", "issue": "HVAC filter replacement", "urgency": "medium", "estimated_cost": 150, "probability": 0.75}], "optimizations": [{"category": "rent", "description": "Consider 3% rent increase for Main St property", "potential_value": 660}]}',
   now() + interval '1 day', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert expense tracking data
INSERT INTO public.expense_tracking (
  id, property_id, portfolio_id, amount, expense_date, category, 
  description, is_tax_deductible, receipt_url, vendor_name, created_at
) VALUES
  ('cc0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 125.50, '2024-01-15', 'maintenance', 'Plumbing repair - kitchen faucet', true, null, 'ABC Plumbing', '2024-01-15'),
  ('cc0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 350.00, '2024-01-20', 'maintenance', 'HVAC repair and maintenance', true, null, 'Comfort HVAC', '2024-01-20'),
  ('cc0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 180.00, '2024-02-01', 'insurance', 'Property insurance premium', true, null, 'SafeGuard Insurance', '2024-02-01'),
  ('cc0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 95.75, '2024-02-10', 'advertising', 'Property listing fees', true, null, 'PropertyPortal Pro', '2024-02-10')
ON CONFLICT (id) DO NOTHING;

-- Insert cash flow forecasts
INSERT INTO public.cash_flow_forecasts (
  id, property_id, portfolio_id, forecast_month, projected_income, 
  projected_expenses, net_cash_flow, confidence_score, created_at
) VALUES
  ('dd0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2024-04-01', 2200, 1750, 450, 0.85, now()),
  ('dd0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2024-05-01', 2200, 1780, 420, 0.82, now()),
  ('dd0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2024-04-01', 3500, 2450, 1050, 0.88, now()),
  ('dd0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '2024-04-01', 2800, 1920, 880, 0.79, now())
ON CONFLICT (id) DO NOTHING;

-- Insert budget alerts
INSERT INTO public.budget_alerts (
  id, property_id, portfolio_id, alert_type, message, threshold_amount, 
  current_amount, severity, status, created_at
) VALUES
  ('ee0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'maintenance_budget_exceeded', 'Maintenance costs have exceeded monthly budget for Oak Ave property', 300.00, 350.00, 'medium', 'active', now() - interval '5 days'),
  ('ee0e8400-e29b-41d4-a716-446655440002', null, '550e8400-e29b-41d4-a716-446655440001', 'low_cash_flow', 'Portfolio cash flow projected to be below target next month', 2000.00, 1470.00, 'high', 'active', now() - interval '2 days'),
  ('ee0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'vacancy_cost', 'Property vacant for 30+ days, consider rent adjustment', 1800.00, 0.00, 'medium', 'active', now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;