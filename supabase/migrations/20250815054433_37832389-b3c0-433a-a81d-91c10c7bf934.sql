-- Create landlord profile first, then add seed data
INSERT INTO public.profiles (id, first_name, last_name, email, phone, user_type, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Demo', 'Landlord', 'demo.landlord@example.com', '555-0100', 'landlord', now() - interval '1 year')
ON CONFLICT (id) DO NOTHING;

-- Insert sample portfolios
INSERT INTO public.portfolios (id, manager_id, client_name, client_email, client_phone, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Downtown Properties LLC', 'info@downtownprops.com', '555-0101', now() - interval '6 months'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Riverside Apartments Inc', 'contact@riverside.com', '555-0102', now() - interval '4 months')
ON CONFLICT (id) DO NOTHING;

-- Insert portfolio roles
INSERT INTO public.portfolio_roles (portfolio_id, user_id, role_name, added_by, permissions_level) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin_partner', '550e8400-e29b-41d4-a716-446655440000', 5),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'admin_partner', '550e8400-e29b-41d4-a716-446655440000', 5)
ON CONFLICT (portfolio_id, user_id) DO NOTHING;