-- Add role column to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'landlord';

-- Add check constraint for role values
ALTER TABLE public.subscription_plans 
ADD CONSTRAINT subscription_plans_role_check 
CHECK (role IN ('tenant', 'landlord', 'both'));

-- Update existing plans with appropriate roles
UPDATE public.subscription_plans SET role = 'both' WHERE id = 'free';
UPDATE public.subscription_plans SET role = 'landlord' WHERE id = 'basic';
UPDATE public.subscription_plans SET role = 'landlord' WHERE id = 'pro';
UPDATE public.subscription_plans SET role = 'landlord' WHERE id = 'premium';
UPDATE public.subscription_plans SET role = 'landlord' WHERE id = 'white_label';

-- Insert a tenant paid plan if it doesn't exist
INSERT INTO public.subscription_plans (id, is_active, role)
VALUES ('tenant_pro', false, 'tenant')
ON CONFLICT (id) DO UPDATE SET role = 'tenant';

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.role IS 'Defines whether this plan is for tenants, landlords, or both';