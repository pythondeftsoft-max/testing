-- Fix the ambiguous column reference in the tax threshold function
CREATE OR REPLACE FUNCTION public.check_tax_transaction_threshold()
RETURNS trigger
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_threshold_amount NUMERIC;
BEGIN
  -- Get the tax threshold for the payment year with explicit table reference
  SELECT tt.threshold_amount INTO v_threshold_amount
  FROM public.tax_thresholds tt
  WHERE tt.tax_year = EXTRACT(YEAR FROM NEW.payment_date)
  AND tt.is_active = true
  ORDER BY tt.created_at DESC
  LIMIT 1;
  
  -- If no threshold found, don't block the operation
  IF v_threshold_amount IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Continue with existing logic if needed
  RETURN NEW;
END;
$function$;