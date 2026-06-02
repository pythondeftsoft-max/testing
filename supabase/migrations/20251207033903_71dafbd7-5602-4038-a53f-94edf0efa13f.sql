-- Drop redundant SELECT policies that may be interfering
DROP POLICY IF EXISTS "Portfolio members can view portfolio units" ON property_units;
DROP POLICY IF EXISTS "Tenants can view their own units" ON property_units;
DROP POLICY IF EXISTS "Admins can manage all units" ON property_units;