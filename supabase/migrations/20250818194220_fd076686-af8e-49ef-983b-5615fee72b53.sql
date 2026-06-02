
-- 1) Create exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS exchange_rates_from_to_created_idx
  ON public.exchange_rates (from_currency, to_currency, created_at DESC);
CREATE INDEX IF NOT EXISTS exchange_rates_created_idx
  ON public.exchange_rates (created_at DESC);

-- 2) Enable RLS and policies
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read exchange rates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'exchange_rates'
      AND policyname = 'Public can read exchange rates'
  ) THEN
    CREATE POLICY "Public can read exchange rates"
      ON public.exchange_rates
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- Admins can manage exchange rates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'exchange_rates'
      AND policyname = 'Admins can manage exchange rates'
  ) THEN
    CREATE POLICY "Admins can manage exchange rates"
      ON public.exchange_rates
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END$$;

-- 3) RPC: get_exchange_rate(from_currency, to_currency) -> numeric
CREATE OR REPLACE FUNCTION public.get_exchange_rate(from_currency TEXT, to_currency TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate NUMERIC;
  v_from TEXT := UPPER(from_currency);
  v_to   TEXT := UPPER(to_currency);
BEGIN
  IF v_from = v_to THEN
    RETURN 1;
  END IF;

  -- Try direct pair
  SELECT er.rate
    INTO v_rate
  FROM public.exchange_rates er
  WHERE er.from_currency = v_from
    AND er.to_currency = v_to
    AND (er.valid_until IS NULL OR er.valid_until > now())
  ORDER BY er.created_at DESC
  LIMIT 1;

  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  -- Fallback to reciprocal of reverse pair
  SELECT 1 / er.rate
    INTO v_rate
  FROM public.exchange_rates er
  WHERE er.from_currency = v_to
    AND er.to_currency = v_from
    AND (er.valid_until IS NULL OR er.valid_until > now())
  ORDER BY er.created_at DESC
  LIMIT 1;

  RETURN v_rate; -- may be NULL if no data found
END;
$$;

-- 4) RPC: convert_currency(amount, from_currency, to_currency) -> TABLE(converted_amount, exchange_rate)
CREATE OR REPLACE FUNCTION public.convert_currency(amount NUMERIC, from_currency TEXT, to_currency TEXT)
RETURNS TABLE(converted_amount NUMERIC, exchange_rate NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  v_rate := public.get_exchange_rate(from_currency, to_currency);

  IF v_rate IS NULL THEN
    -- Return no rows if we can't find a rate
    RETURN;
  END IF;

  converted_amount := amount * v_rate;
  exchange_rate := v_rate;
  RETURN NEXT;
END;
$$;

-- 5) Seed baseline rates (idempotent) for USD/EUR/GBP/JPY/CAD/AUD/MXN
-- Note: These are placeholder seeds; you can later update via admin tooling or API.
WITH seed_pairs AS (
  SELECT * FROM (VALUES
    ('USD','EUR',0.92::NUMERIC),
    ('USD','GBP',0.78::NUMERIC),
    ('USD','JPY',155.00::NUMERIC),
    ('USD','CAD',1.36::NUMERIC),
    ('USD','AUD',1.50::NUMERIC),
    ('USD','MXN',18.00::NUMERIC)
  ) AS t(from_currency, to_currency, rate)
),
insert_direct AS (
  INSERT INTO public.exchange_rates (from_currency, to_currency, rate, source)
  SELECT UPPER(from_currency), UPPER(to_currency), rate, 'seed'
  FROM seed_pairs sp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.exchange_rates er 
    WHERE er.from_currency = UPPER(sp.from_currency)
      AND er.to_currency   = UPPER(sp.to_currency)
  )
  RETURNING 1
)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, source)
SELECT UPPER(to_currency), UPPER(from_currency), (1.0 / rate), 'seed'
FROM seed_pairs sp
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.exchange_rates er 
  WHERE er.from_currency = UPPER(sp.to_currency)
    AND er.to_currency   = UPPER(sp.from_currency)
);
