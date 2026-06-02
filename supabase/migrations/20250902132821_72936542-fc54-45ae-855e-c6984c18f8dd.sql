-- Create AI tables and basic infrastructure

-- Create ai_predictions table
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

-- Enable RLS
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

-- Create ai_model_metrics table
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

-- Enable RLS
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- Create ai_function_invocations table
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

-- Enable RLS
ALTER TABLE public.ai_function_invocations ENABLE ROW LEVEL SECURITY;

-- Add triggers for updated_at
CREATE TRIGGER update_ai_predictions_updated_at
  BEFORE UPDATE ON public.ai_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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