-- Create AI tables if they don't exist and add proper RLS policies

-- Create ai_predictions table if not exists
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id),
  property_id UUID REFERENCES public.properties(id),
  prediction_type TEXT NOT NULL,
  predicted_value NUMERIC,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  prediction_date DATE NOT NULL,
  actual_value NUMERIC,
  accuracy_score NUMERIC,
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Create ai_model_metrics table if not exists
CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  portfolio_id UUID REFERENCES public.portfolios(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_name, model_version, metric_type, measurement_date, portfolio_id)
);

-- Enable RLS on all AI tables
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "System can manage predictions" ON public.ai_predictions;
    DROP POLICY IF EXISTS "System can manage insights cache" ON public.ai_insights_cache;
    DROP POLICY IF EXISTS "System can manage model metrics" ON public.ai_model_metrics;
EXCEPTION 
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create RLS policies for ai_insights_cache
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

-- Create RLS policies for ai_predictions
CREATE POLICY "Users can view predictions for their properties" 
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

CREATE POLICY "Service role can manage predictions" 
  ON public.ai_predictions 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

-- Create RLS policies for ai_model_metrics
CREATE POLICY "Users can view model metrics for their portfolios" 
  ON public.ai_model_metrics 
  FOR SELECT 
  USING (
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    OR 
    (portfolio_id IS NULL) -- Allow viewing global metrics
  );

CREATE POLICY "Service role can manage model metrics" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (current_setting('role') = 'service_role');

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