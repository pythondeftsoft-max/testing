-- Add bathrooms_approved column to tenant_profiles
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS bathrooms_approved TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_profiles.bathrooms_approved IS 'Array of bathroom counts the tenant is willing to accept (e.g., ["1", "2", "3+"])';