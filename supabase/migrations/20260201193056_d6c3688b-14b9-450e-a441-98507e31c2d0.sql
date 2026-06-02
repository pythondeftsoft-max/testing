-- Create drive_time_cache table for caching Google Routes API results
CREATE TABLE public.drive_time_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_zip TEXT NOT NULL,
  destination_zip TEXT NOT NULL,
  drive_time_minutes INTEGER NOT NULL,
  distance_km NUMERIC,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  
  -- Unique constraint to prevent duplicate entries
  CONSTRAINT unique_zip_pair UNIQUE (origin_zip, destination_zip)
);

-- Create index for fast lookups
CREATE INDEX idx_drive_time_cache_zips ON public.drive_time_cache (origin_zip, destination_zip);
CREATE INDEX idx_drive_time_cache_expires ON public.drive_time_cache (expires_at);

-- Enable RLS
ALTER TABLE public.drive_time_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage drive time cache"
ON public.drive_time_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.drive_time_cache IS 'Caches drive time calculations between ZIP codes to reduce Google Routes API costs';