-- =====================================================
-- FIX SECURITY ISSUES: Create safe views and restrict base table access
-- =====================================================

-- 1. PROPERTIES MARKETPLACE VIEW
-- Excludes: owner_id, mortgage_cost, insurance_cost, property_taxes, hoa_fees, landlord data
CREATE OR REPLACE VIEW public.properties_marketplace
WITH (security_invoker = on) AS
SELECT 
  id, address, street_address, city, state, zipcode, country,
  monthly_rent, bedrooms, bathrooms, square_feet,
  photos, description, amenities, move_in_date,
  has_voucher, voucher_type, min_voucher_amount, max_voucher_amount,
  pet_policy, max_pets, furnished, utilities_included,
  laundry_type, air_conditioning, parking_type, garage_spaces,
  accessibility_features, latitude, longitude,
  on_market, status, property_type, year_built,
  created_at
FROM properties
WHERE on_market = true AND deleted_at IS NULL;

-- 2. PROPERTY UNITS MARKETPLACE VIEW
-- Excludes: tenant_id, financial details not relevant to browsing
CREATE OR REPLACE VIEW public.property_units_marketplace
WITH (security_invoker = on) AS
SELECT 
  pu.id, pu.property_id, pu.unit_number, pu.bedrooms, pu.bathrooms, 
  pu.square_feet, pu.monthly_rent, pu.security_deposit, 
  pu.photos, pu.amenities, pu.description,
  pu.on_market, pu.status
FROM property_units pu
JOIN properties p ON p.id = pu.property_id
WHERE pu.on_market = true AND p.deleted_at IS NULL;

-- 3. PROFILES PUBLIC VIEW
-- Excludes: email, phone, stripe data, sensitive personal data
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id, first_name, last_name, user_type, company_name, created_at
FROM profiles;

-- 4. TENANT PROFILES FOR LANDLORDS VIEW
-- Only shows application-relevant fields, excludes credit score, income, eviction/felony history
CREATE OR REPLACE VIEW public.tenant_profiles_for_landlords
WITH (security_invoker = on) AS
SELECT 
  user_id,
  voucher_status, voucher_holder, housing_authority,
  bedrooms_approved, rent_range_min, rent_range_max,
  move_in_window, has_pets, has_accessibility_needs,
  preferred_locations, city, state, zip_code
  -- Excludes: credit_score_range, monthly_income, has_eviction, has_felonies
FROM tenant_profiles;

-- 5. DROP OVERLY PERMISSIVE RLS POLICIES

-- Drop anonymous/public marketplace policies on base properties table
DROP POLICY IF EXISTS "Anonymous users can browse marketplace properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can browse marketplace properties" ON properties;

-- Drop the overly permissive property_units policy
DROP POLICY IF EXISTS "Users can view property units" ON property_units;

-- 6. CREATE RESTRICTED REPLACEMENT POLICIES

-- Property units: Only owners, portfolio members, admins, and assigned tenants can see base table
CREATE POLICY "Authorized users can view property units"
ON property_units FOR SELECT
USING (
  is_admin(auth.uid())
  OR user_owns_property(property_id)
  OR has_portfolio_role(
    (SELECT portfolio_id FROM properties WHERE id = property_id),
    auth.uid(),
    ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[]
  )
  OR tenant_id = auth.uid()
);

-- 7. GRANT SELECT ON VIEWS
-- Allow authenticated and anonymous users to query the safe views
GRANT SELECT ON public.properties_marketplace TO anon, authenticated;
GRANT SELECT ON public.property_units_marketplace TO anon, authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.tenant_profiles_for_landlords TO authenticated;