-- Remove bathrooms_approved column from tenant_profiles
-- This field is conceptually incorrect for voucher tenants (vouchers only approve bedrooms, not bathrooms)
ALTER TABLE public.tenant_profiles 
DROP COLUMN IF EXISTS bathrooms_approved;