-- Create RPC functions for currency conversion and address validation

-- Currency conversion function
CREATE OR REPLACE FUNCTION convert_currency(
  amount NUMERIC,
  from_currency TEXT,
  to_currency TEXT
) RETURNS TABLE(
  converted_amount NUMERIC,
  exchange_rate NUMERIC
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Simple fallback rates for demo - in production this would connect to live rates
  RETURN QUERY
  SELECT 
    CASE 
      WHEN from_currency = to_currency THEN amount
      WHEN from_currency = 'USD' AND to_currency = 'EUR' THEN amount * 0.85
      WHEN from_currency = 'EUR' AND to_currency = 'USD' THEN amount * 1.18
      WHEN from_currency = 'USD' AND to_currency = 'GBP' THEN amount * 0.79
      WHEN from_currency = 'GBP' AND to_currency = 'USD' THEN amount * 1.27
      WHEN from_currency = 'EUR' AND to_currency = 'GBP' THEN amount * 0.93
      WHEN from_currency = 'GBP' AND to_currency = 'EUR' THEN amount * 1.08
      ELSE amount -- fallback to original amount
    END as converted_amount,
    CASE 
      WHEN from_currency = to_currency THEN 1.0
      WHEN from_currency = 'USD' AND to_currency = 'EUR' THEN 0.85
      WHEN from_currency = 'EUR' AND to_currency = 'USD' THEN 1.18
      WHEN from_currency = 'USD' AND to_currency = 'GBP' THEN 0.79
      WHEN from_currency = 'GBP' AND to_currency = 'USD' THEN 1.27
      WHEN from_currency = 'EUR' AND to_currency = 'GBP' THEN 0.93
      WHEN from_currency = 'GBP' AND to_currency = 'EUR' THEN 1.08
      ELSE 1.0
    END as exchange_rate;
END;
$$;

-- Exchange rate function
CREATE OR REPLACE FUNCTION get_exchange_rate(
  from_currency TEXT,
  to_currency TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (
    SELECT exchange_rate 
    FROM convert_currency(1.0, from_currency, to_currency)
  );
END;
$$;

-- Update profiles table to support international preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_country TEXT,
ADD COLUMN IF NOT EXISTS preferred_currency_code TEXT DEFAULT 'USD';