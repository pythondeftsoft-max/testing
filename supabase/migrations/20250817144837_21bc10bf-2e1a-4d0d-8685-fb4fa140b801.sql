
-- Phase 2: Free Market Data Infrastructure v1
-- 1) Batch upsert RPC for asset_price_history (used by edge function)
CREATE OR REPLACE FUNCTION public.upsert_asset_price_history_batch(
  p_symbol TEXT,
  p_interval TEXT,
  p_history JSONB  -- JSON array of objects: [{ timestamp, open, high, low, close, volume, dataSource }]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_rows INTEGER := 0;
BEGIN
  -- Normalize symbol to uppercase
  WITH ins AS (
    INSERT INTO public.asset_price_history (
      symbol, date_time, interval_type,
      open_price, high_price, low_price, close_price, volume, data_source, created_at, updated_at
    )
    SELECT 
      UPPER(p_symbol) AS symbol,
      (j->>'timestamp')::timestamptz AS date_time,
      p_interval AS interval_type,
      NULLIF(j->>'open','')::numeric AS open_price,
      NULLIF(j->>'high','')::numeric AS high_price,
      NULLIF(j->>'low','')::numeric AS low_price,
      NULLIF(j->>'close','')::numeric AS close_price,
      NULLIF(j->>'volume','')::bigint AS volume,
      COALESCE(NULLIF(j->>'dataSource',''), 'yahoo') AS data_source,
      now() AS created_at,
      now() AS updated_at
    FROM jsonb_array_elements(p_history) AS j
    WHERE (j->>'timestamp') IS NOT NULL
    ON CONFLICT (symbol, date_time, interval_type)
    DO UPDATE SET
      open_price  = EXCLUDED.open_price,
      high_price  = EXCLUDED.high_price,
      low_price   = EXCLUDED.low_price,
      close_price = EXCLUDED.close_price,
      volume      = EXCLUDED.volume,
      data_source = EXCLUDED.data_source,
      updated_at  = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_rows FROM ins;

  RETURN v_rows;
END;
$function$;

-- Permissions: allow calls from both edge functions (anon key) and signed-in users
GRANT EXECUTE ON FUNCTION public.upsert_asset_price_history_batch(TEXT, TEXT, JSONB) TO anon, authenticated;

-- 2) Fast read RPC for cached price history
CREATE OR REPLACE FUNCTION public.get_cached_price_history(
  p_symbol TEXT,
  p_interval TEXT DEFAULT '1d',
  p_min_date_time timestamptz DEFAULT (now() - interval '5 days'),
  p_limit INT DEFAULT 5000
)
RETURNS TABLE(
  "timestamp" timestamptz,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint,
  data_source text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT
    aph.date_time       AS "timestamp",
    COALESCE(aph.open_price, aph.close_price) AS open,
    COALESCE(aph.high_price, aph.close_price) AS high,
    COALESCE(aph.low_price, aph.close_price)  AS low,
    aph.close_price      AS close,
    aph.volume           AS volume,
    aph.data_source      AS data_source,
    aph.created_at       AS created_at
  FROM public.asset_price_history aph
  WHERE aph.symbol = UPPER(p_symbol)
    AND aph.interval_type = p_interval
    AND aph.date_time >= p_min_date_time
  ORDER BY aph.date_time ASC
  LIMIT p_limit;
$function$;

GRANT EXECUTE ON FUNCTION public.get_cached_price_history(TEXT, TEXT, timestamptz, INT) TO anon, authenticated;

-- 3) Performance index to speed RPC lookups
CREATE INDEX IF NOT EXISTS idx_aph_symbol_interval_date_desc
  ON public.asset_price_history(symbol, interval_type, date_time DESC);
