-- Add missing columns to ai_insights_cache and create proper structure

-- Add missing columns to ai_insights_cache
ALTER TABLE public.ai_insights_cache 
ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id),
ADD COLUMN IF NOT EXISTS landlord_id UUID,
ADD COLUMN IF NOT EXISTS analysis_type TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS insights_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
ADD COLUMN IF NOT EXISTS hit_count INTEGER DEFAULT 0;

-- Rename insights column to insights_data if different
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_insights_cache' AND column_name = 'insights') THEN
        ALTER TABLE public.ai_insights_cache RENAME COLUMN insights TO insights_data;
    END IF;
EXCEPTION 
    WHEN duplicate_column THEN 
        NULL;
END $$;

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
    (portfolio_id IS NULL)
  );

CREATE POLICY "Service role can manage model metrics" 
  ON public.ai_model_metrics 
  FOR ALL 
  USING (current_setting('role') = 'service_role');