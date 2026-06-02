-- Phase 1: Database Schema Updates for Subscription System

-- Update subscriptions table with new fields
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('tenant', 'landlord'));

-- Update existing subscriptions to have a role (assuming existing ones are tenant subscriptions)
UPDATE public.subscriptions SET role = 'tenant' WHERE role IS NULL;

-- Make role NOT NULL after setting defaults
ALTER TABLE public.subscriptions ALTER COLUMN role SET NOT NULL;

-- Add subscription fields to profiles table for landlords
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Add application tracking to tenant_profiles for limits
ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS applications_this_month INTEGER DEFAULT 0;
ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS last_application_reset DATE DEFAULT CURRENT_DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_role ON public.subscriptions(user_id, role);

-- Function to reset monthly application counts
CREATE OR REPLACE FUNCTION public.reset_monthly_applications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tenant_profiles 
  SET applications_this_month = 0,
      last_application_reset = CURRENT_DATE
  WHERE last_application_reset < CURRENT_DATE - INTERVAL '1 month';
END;
$$;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id UUID, subscription_role TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = $1 
    AND status = 'active'
    AND (subscription_role IS NULL OR role = subscription_role)
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
$$;

-- Function to get user subscription details
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_id UUID, subscription_role TEXT DEFAULT NULL)
RETURNS TABLE(
  subscription_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT,
  status TEXT,
  role TEXT,
  current_period_end TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    s.id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.plan_type,
    s.status,
    s.role,
    s.current_period_end
  FROM public.subscriptions s
  WHERE s.user_id = $1 
  AND (subscription_role IS NULL OR s.role = subscription_role)
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;