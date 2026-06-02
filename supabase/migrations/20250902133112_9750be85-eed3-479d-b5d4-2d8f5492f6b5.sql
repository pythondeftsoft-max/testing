-- Add RLS policies for the new AI tables

-- RLS policies for ai_predictions
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

-- RLS policies for ai_model_metrics
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

-- RLS policies for ai_function_invocations
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

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_predictions_portfolio_property ON public.ai_predictions(portfolio_id, property_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_expires_at ON public.ai_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_landlord_portfolio ON public.ai_insights_cache(landlord_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires_at ON public.ai_insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_function_invocations_function_name ON public.ai_function_invocations(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_function_invocations_created_at ON public.ai_function_invocations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_lookup ON public.ai_model_metrics(model_name, model_version, measurement_date);

-- Update system_config for Phase 3 controls
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