-- Create AI insights cache table for performance optimization
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  insights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for AI insights cache
CREATE POLICY "Users can view their cached insights" 
ON public.ai_insights_cache 
FOR SELECT 
USING (true); -- Cache is shared for efficiency

CREATE POLICY "System can manage cache" 
ON public.ai_insights_cache 
FOR ALL 
USING (true);

-- Create index for faster cache lookups
CREATE INDEX idx_ai_insights_cache_key ON public.ai_insights_cache(cache_key);
CREATE INDEX idx_ai_insights_cache_created_at ON public.ai_insights_cache(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_insights_cache_updated_at
BEFORE UPDATE ON public.ai_insights_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();