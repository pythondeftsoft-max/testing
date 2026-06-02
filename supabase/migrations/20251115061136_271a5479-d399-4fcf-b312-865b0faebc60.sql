-- Create subscription plans table to track active/inactive status
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view plans (needed for admin dashboard)
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (auth.role() = 'authenticated');

-- Seed with existing plans
INSERT INTO public.subscription_plans (id, is_active, display_order)
VALUES 
  ('free', true, 1),
  ('basic', true, 2),
  ('pro', true, 3),
  ('premium', true, 4),
  ('white_label', true, 5)
ON CONFLICT (id) DO NOTHING;

-- Create admin RPC function to toggle plan status
-- Note: Permission checks should be added based on your admin authentication system
CREATE OR REPLACE FUNCTION public.admin_toggle_plan_status(
  p_plan_id TEXT,
  p_is_active BOOLEAN
)
RETURNS public.subscription_plans
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result subscription_plans;
BEGIN
  -- Basic authentication check - modify based on your admin system
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Update or insert plan status
  INSERT INTO subscription_plans (id, is_active, updated_at)
  VALUES (p_plan_id, p_is_active, now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    is_active = p_is_active,
    updated_at = now()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;