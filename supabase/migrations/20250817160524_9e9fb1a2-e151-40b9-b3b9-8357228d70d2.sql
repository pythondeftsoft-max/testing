-- Create asset_price_history table if not exists
CREATE TABLE IF NOT EXISTS public.asset_price_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    interval_type TEXT NOT NULL DEFAULT '1d', -- '1d', '1h', '1m' etc
    price_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open NUMERIC,
    high NUMERIC,
    low NUMERIC,
    close NUMERIC NOT NULL,
    volume BIGINT,
    data_source TEXT DEFAULT 'yahoo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(symbol, interval_type, price_timestamp)
);

-- Enable RLS
ALTER TABLE public.asset_price_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view price history" 
ON public.asset_price_history 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- System can insert/update price history (edge functions)
CREATE POLICY "System can manage price history" 
ON public.asset_price_history 
FOR ALL 
USING (true);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_asset_price_history_symbol_interval ON public.asset_price_history(symbol, interval_type);
CREATE INDEX IF NOT EXISTS idx_asset_price_history_timestamp ON public.asset_price_history(price_timestamp DESC);

-- Create RPC for batch upsert (used by edge functions)
CREATE OR REPLACE FUNCTION public.upsert_asset_price_history_batch(
    p_symbol TEXT,
    p_interval TEXT,
    p_history JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.asset_price_history (symbol, interval_type, price_timestamp, open, high, low, close, volume, data_source)
    SELECT 
        p_symbol,
        p_interval,
        (point->>'timestamp')::timestamp with time zone,
        (point->>'open')::numeric,
        (point->>'high')::numeric,
        (point->>'low')::numeric,
        (point->>'close')::numeric,
        (point->>'volume')::bigint,
        COALESCE(point->>'dataSource', 'yahoo')
    FROM jsonb_array_elements(p_history) AS point
    ON CONFLICT (symbol, interval_type, price_timestamp) 
    DO UPDATE SET 
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        data_source = EXCLUDED.data_source,
        updated_at = now();
END;
$$;

-- Create RPC for cached retrieval (used by frontend)
CREATE OR REPLACE FUNCTION public.get_cached_price_history(
    p_symbol TEXT,
    p_interval TEXT DEFAULT '1d',
    p_min_date_time TIMESTAMP WITH TIME ZONE DEFAULT (now() - interval '30 days'),
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
    price_timestamp TIMESTAMP WITH TIME ZONE,
    open NUMERIC,
    high NUMERIC,
    low NUMERIC,
    close NUMERIC,
    volume BIGINT,
    data_source TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aph.price_timestamp,
        aph.open,
        aph.high,
        aph.low,
        aph.close,
        aph.volume,
        aph.data_source
    FROM public.asset_price_history aph
    WHERE aph.symbol = p_symbol 
        AND aph.interval_type = p_interval
        AND aph.price_timestamp >= p_min_date_time
    ORDER BY aph.price_timestamp DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upsert_asset_price_history_batch TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_price_history TO anon, authenticated;