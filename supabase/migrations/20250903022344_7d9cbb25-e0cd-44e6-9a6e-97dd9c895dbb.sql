-- Create application_quota_resets table for manual admin resets
CREATE TABLE public.application_quota_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX idx_application_quota_resets_tenant_reset ON public.application_quota_resets(tenant_id, reset_at DESC);

-- Enable RLS
ALTER TABLE public.application_quota_resets ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can insert resets
CREATE POLICY "Admins can insert quota resets" ON public.application_quota_resets
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- RLS policy: Admins can view all resets
CREATE POLICY "Admins can view quota resets" ON public.application_quota_resets
  FOR SELECT USING (is_admin(auth.uid()));

-- Alter property_pushes table to add quota bypass functionality
ALTER TABLE public.property_pushes 
ADD COLUMN quota_bypass BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '14 days');

-- Add index for efficient bypass checks
CREATE INDEX idx_property_pushes_bypass ON public.property_pushes(tenant_id, property_id, expires_at) WHERE quota_bypass = true;

-- Update check_application_quota function to handle resets and admin pushes
CREATE OR REPLACE FUNCTION public.check_application_quota(p_tenant_id UUID)
RETURNS TABLE(
  can_apply BOOLEAN,
  remaining_applications INTEGER,
  is_subscriber BOOLEAN
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_applications_count INTEGER;
  v_is_subscriber BOOLEAN;
  v_weekly_limit INTEGER := 5;
BEGIN
  -- Check if user has active subscription
  SELECT has_active_subscription(p_tenant_id, 'tenant') INTO v_is_subscriber;
  
  -- If subscriber, return unlimited
  IF v_is_subscriber THEN
    RETURN QUERY SELECT true, 999, true;
    RETURN;
  END IF;
  
  -- Get the most recent reset date for this tenant
  SELECT reset_at INTO v_last_reset
  FROM public.application_quota_resets
  WHERE tenant_id = p_tenant_id
  ORDER BY reset_at DESC
  LIMIT 1;
  
  -- Calculate window start (7 days ago or last reset, whichever is more recent)
  v_window_start := GREATEST(
    now() - INTERVAL '7 days',
    COALESCE(v_last_reset, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );
  
  -- Count applications in the current window
  SELECT COUNT(*) INTO v_applications_count
  FROM public.property_applications
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_window_start;
  
  -- Return quota status
  RETURN QUERY SELECT 
    (v_applications_count < v_weekly_limit),
    GREATEST(0, v_weekly_limit - v_applications_count),
    v_is_subscriber;
END;
$$;

-- Update enforce_weekly_application_limit trigger function to handle admin pushes
CREATE OR REPLACE FUNCTION public.enforce_weekly_application_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_applications_count INTEGER;
  v_is_subscriber BOOLEAN;
  v_has_admin_push BOOLEAN;
  v_weekly_limit INTEGER := 5;
BEGIN
  -- Check if user has active subscription
  SELECT has_active_subscription(NEW.tenant_id, 'tenant') INTO v_is_subscriber;
  
  -- If subscriber, allow unlimited applications
  IF v_is_subscriber THEN
    RETURN NEW;
  END IF;
  
  -- Check for active admin push that bypasses quota
  SELECT EXISTS(
    SELECT 1 FROM public.property_pushes
    WHERE tenant_id = NEW.tenant_id
      AND property_id = NEW.property_id
      AND quota_bypass = true
      AND now() <= expires_at
  ) INTO v_has_admin_push;
  
  -- If admin push exists, bypass quota
  IF v_has_admin_push THEN
    RETURN NEW;
  END IF;
  
  -- Get the most recent reset date for this tenant
  SELECT reset_at INTO v_last_reset
  FROM public.application_quota_resets
  WHERE tenant_id = NEW.tenant_id
  ORDER BY reset_at DESC
  LIMIT 1;
  
  -- Calculate window start (7 days ago or last reset, whichever is more recent)
  v_window_start := GREATEST(
    now() - INTERVAL '7 days',
    COALESCE(v_last_reset, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );
  
  -- Count existing applications in the current window
  SELECT COUNT(*) INTO v_applications_count
  FROM public.property_applications
  WHERE tenant_id = NEW.tenant_id
    AND created_at >= v_window_start;
  
  -- Check if limit would be exceeded
  IF v_applications_count >= v_weekly_limit THEN
    RAISE EXCEPTION 'Weekly application limit of % reached. You can apply to % more properties this week.', 
      v_weekly_limit, GREATEST(0, v_weekly_limit - v_applications_count);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create admin function to reset tenant application quota
CREATE OR REPLACE FUNCTION public.admin_reset_tenant_application_quota(
  p_tenant_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_name TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reset application quotas';
  END IF;
  
  -- Get tenant name for notification
  SELECT CONCAT(first_name, ' ', last_name) INTO v_tenant_name
  FROM public.profiles
  WHERE id = p_tenant_id;
  
  -- Insert quota reset record
  INSERT INTO public.application_quota_resets (
    tenant_id,
    reason,
    created_by
  ) VALUES (
    p_tenant_id,
    p_reason,
    auth.uid()
  );
  
  -- Create in-app notification for tenant
  INSERT INTO public.notifications (
    user_id,
    title,
    description,
    type,
    category,
    metadata
  ) VALUES (
    p_tenant_id,
    'Application Credits Refreshed',
    'Your application credits have been refreshed by an admin. You can now apply to properties again.',
    'success',
    'application',
    jsonb_build_object(
      'reset_by_admin', true,
      'reason', p_reason
    )
  );
  
  RETURN TRUE;
END;
$$;