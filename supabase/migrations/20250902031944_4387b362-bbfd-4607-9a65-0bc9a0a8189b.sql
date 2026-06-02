
-- Add Phase 3 configuration to system_config
UPDATE system_config 
SET config_value = jsonb_set(
  config_value,
  '{ai_insights}',
  '{
    "enabled": true,
    "prediction_horizon_days": 90,
    "confidence_threshold": 0.75,
    "max_predictions_per_property": 5,
    "cache_duration_hours": 24,
    "model_version": "v1.0"
  }'::jsonb
)
WHERE config_key = 'features';

-- Create AI predictions table
CREATE TABLE public.ai_predictions (
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

-- Create AI insights cache table
CREATE TABLE public.ai_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  portfolio_id UUID REFERENCES public.portfolios(id),
  landlord_id UUID,
  analysis_type TEXT NOT NULL,
  insights_data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI model metrics table
CREATE TABLE public.ai_model_metrics (
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

-- Add RLS policies for ai_predictions
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view predictions for their portfolios" 
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

CREATE POLICY "System can manage predictions" 
  ON public.ai_predictions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for ai_insights_cache
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cached insights for their portfolios" 
  ON public.ai_insights_cache 
  FOR SELECT 
  USING (
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    OR 
    (landlord_id = auth.uid())
  );

CREATE POLICY "System can manage insights cache" 
  ON public.ai_insights_cache 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for ai_model_metrics
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view model metrics for their portfolios" 
  ON public.ai_model_metrics 
  FOR SELECT 
  USING (
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    OR 
    (portfolio_id IS NULL) -- Allow viewing global metrics
  );

CREATE POLICY "System can manage model metrics" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_ai_predictions_portfolio_property ON public.ai_predictions(portfolio_id, property_id);
CREATE INDEX idx_ai_predictions_expires_at ON public.ai_predictions(expires_at);
CREATE INDEX idx_ai_insights_cache_key ON public.ai_insights_cache(cache_key);
CREATE INDEX idx_ai_insights_cache_expires_at ON public.ai_insights_cache(expires_at);
CREATE INDEX idx_ai_model_metrics_lookup ON public.ai_model_metrics(model_name, model_version, measurement_date);

-- Add triggers for updated_at
CREATE TRIGGER update_ai_predictions_updated_at
  BEFORE UPDATE ON public.ai_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_insights_cache_updated_at
  BEFORE UPDATE ON public.ai_insights_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
