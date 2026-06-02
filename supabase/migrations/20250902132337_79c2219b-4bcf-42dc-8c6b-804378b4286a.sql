-- Clean up and create proper RLS policies for AI tables

-- Drop all existing policies on AI tables
DROP POLICY IF EXISTS "Users can view their cached insights" ON public.ai_insights_cache;
DROP POLICY IF EXISTS "Users can manage their cached insights" ON public.ai_insights_cache;
DROP POLICY IF EXISTS "Users can update their cached insights" ON public.ai_insights_cache;
DROP POLICY IF EXISTS "Users can view predictions for their properties" ON public.ai_predictions;
DROP POLICY IF EXISTS "Service role can manage predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "Users can view model metrics for their portfolios" ON public.ai_model_metrics;
DROP POLICY IF EXISTS "Service role can manage model metrics" ON public.ai_model_metrics;

-- Create function invocations table for observability
CREATE TABLE IF NOT EXISTS public.ai_function_invocations (
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

-- Create new RLS policies for ai_insights_cache
CREATE POLICY "ai_insights_cache_select_policy" 
  ON public.ai_insights_cache 
  FOR SELECT 
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
  );

CREATE POLICY "ai_insights_cache_insert_policy" 
  ON public.ai_insights_cache 
  FOR INSERT
  WITH CHECK (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  );

CREATE POLICY "ai_insights_cache_update_policy" 
  ON public.ai_insights_cache 
  FOR UPDATE
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  );

-- Create RLS policies for ai_predictions
CREATE POLICY "ai_predictions_select_policy" 
  ON public.ai_predictions 
  FOR SELECT 
  USING (
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    OR 
    (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = ai_predictions.property_id 
      AND p.owner_id = auth.uid()
    ))
  );

CREATE POLICY "ai_predictions_service_policy" 
  ON public.ai_predictions 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

-- Create RLS policies for ai_model_metrics
CREATE POLICY "ai_model_metrics_select_policy" 
  ON public.ai_model_metrics 
  FOR SELECT 
  USING (
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    OR 
    (portfolio_id IS NULL)
  );

CREATE POLICY "ai_model_metrics_service_policy" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

-- Create RLS policies for ai_function_invocations
CREATE POLICY "ai_function_invocations_select_policy" 
  ON public.ai_function_invocations 
  FOR SELECT 
  USING (
    (landlord_id = auth.uid()) OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
  );

CREATE POLICY "ai_function_invocations_service_policy" 
  ON public.ai_function_invocations 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

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
  
  RETURN purged_count;
END;
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_predictions_portfolio_property ON public.ai_predictions(portfolio_id, property_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_expires_at ON public.ai_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires_at ON public.ai_insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_function_invocations_function_name ON public.ai_function_invocations(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_function_invocations_created_at ON public.ai_function_invocations(created_at);