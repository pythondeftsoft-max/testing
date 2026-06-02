-- Tighten RLS policies for AI tables

-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can manage predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "System can manage insights cache" ON public.ai_insights_cache;
DROP POLICY IF EXISTS "System can manage model metrics" ON public.ai_model_metrics;

-- Create stricter RLS policies for ai_insights_cache
CREATE POLICY "Users can view their cached insights" 
  ON public.ai_insights_cache 
  FOR SELECT 
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
  );

CREATE POLICY "Users can manage their cached insights" 
  ON public.ai_insights_cache 
  FOR INSERT
  WITH CHECK (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  );

CREATE POLICY "Users can update their cached insights" 
  ON public.ai_insights_cache 
  FOR UPDATE
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  );

-- Create stricter RLS policies for ai_predictions
CREATE POLICY "Service role can manage predictions" 
  ON public.ai_predictions 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage predictions" 
  ON public.ai_predictions 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Create stricter RLS policies for ai_model_metrics
CREATE POLICY "Service role can manage model metrics" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage model metrics" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Create function to purge expired AI cache
CREATE OR REPLACE FUNCTION public.purge_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  purged_count INTEGER;
BEGIN
  -- Delete expired cache entries
  WITH deleted AS (
    DELETE FROM public.ai_insights_cache 
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO purged_count FROM deleted;
  
  -- Delete expired predictions
  DELETE FROM public.ai_predictions 
  WHERE expires_at < now();
  
  -- Log the cleanup
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    details
  ) VALUES (
    NULL,
    'purge_expired_cache',
    'ai_insights_cache',
    jsonb_build_object('purged_count', purged_count, 'purged_at', now())
  );
  
  RETURN purged_count;
END;
$$;

-- Create function invocations table for observability
CREATE TABLE public.ai_function_invocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  landlord_id UUID,
  portfolio_id UUID,
  request_id TEXT,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  cache_hit BOOLEAN DEFAULT false,
  request_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on function invocations
ALTER TABLE public.ai_function_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their function invocations" 
  ON public.ai_function_invocations 
  FOR SELECT 
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
  );

CREATE POLICY "Service role can manage invocations" 
  ON public.ai_function_invocations 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

-- Add indexes for performance
CREATE INDEX idx_ai_function_invocations_function_name ON public.ai_function_invocations(function_name);
CREATE INDEX idx_ai_function_invocations_created_at ON public.ai_function_invocations(created_at);
CREATE INDEX idx_ai_function_invocations_landlord_portfolio ON public.ai_function_invocations(landlord_id, portfolio_id);

-- Update system_config for AI performance controls
UPDATE system_config 
SET config_value = jsonb_set(
  config_value,
  '{ai_controls}',
  '{
    "global_enabled": true,
    "insights_engine": {
      "enabled": true,
      "cache_ttl_hours": 24,
      "rate_limit_per_hour": 60,
      "confidence_threshold": 0.75
    },
    "predictive_maintenance": {
      "enabled": true,
      "cache_ttl_hours": 72,
      "prediction_horizon_days": 90
    },
    "portfolio_optimizer": {
      "enabled": true,
      "cache_ttl_hours": 48
    },
    "tenant_communication": {
      "enabled": true,
      "rate_limit_per_day": 100
    }
  }'::jsonb
)
WHERE config_key = 'features';