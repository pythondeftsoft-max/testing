-- Drop old 3-parameter versions of currency functions that are causing conflicts
DROP FUNCTION IF EXISTS public.get_exchange_rate(text, text, date);
DROP FUNCTION IF EXISTS public.convert_currency(numeric, text, text, date);

-- Verify the 2-parameter versions exist and work correctly
-- The new versions should use the exchange_rates table (not currency_exchange_rates)
COMMENT ON FUNCTION public.get_exchange_rate(text, text) IS 'Gets exchange rate between two currencies from exchange_rates table';
COMMENT ON FUNCTION public.convert_currency(numeric, text, text) IS 'Converts amount between currencies using exchange_rates table';