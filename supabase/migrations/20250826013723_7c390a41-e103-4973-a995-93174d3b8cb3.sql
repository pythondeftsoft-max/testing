-- Fix security issue for the functions created in asset reminder preferences migration
-- Set proper search path for security

DROP FUNCTION IF EXISTS public.update_asset_reminder_next_date();
DROP FUNCTION IF EXISTS public.get_overdue_asset_reminders();

-- Recreate function with proper security settings
CREATE OR REPLACE FUNCTION public.update_asset_reminder_next_date()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only update next_reminder_date if reminders are enabled and last_financial_update is set
  IF NEW.is_enabled = true AND NEW.last_financial_update IS NOT NULL THEN
    NEW.next_reminder_date := public.compute_next_reminder_date(
      NEW.last_financial_update::timestamp with time zone, 
      NEW.frequency
    );
  ELSE
    NEW.next_reminder_date := NULL;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Recreate function with proper security settings
CREATE OR REPLACE FUNCTION public.get_overdue_asset_reminders()
RETURNS TABLE(
  id UUID,
  asset_id UUID,
  user_id UUID,
  portfolio_id UUID,
  asset_name TEXT,
  user_email TEXT,
  frequency TEXT,
  days_overdue INTEGER,
  last_financial_update DATE,
  next_reminder_date DATE
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    arp.id,
    arp.asset_id,
    arp.user_id,
    arp.portfolio_id,
    COALESCE(pa.asset_name, p.address) as asset_name,
    au.email as user_email,
    arp.frequency,
    (CURRENT_DATE - arp.next_reminder_date)::INTEGER as days_overdue,
    arp.last_financial_update,
    arp.next_reminder_date
  FROM public.asset_reminder_preferences arp
  LEFT JOIN public.portfolio_assets pa ON arp.asset_id = pa.id
  LEFT JOIN public.properties p ON arp.asset_id = p.id
  JOIN auth.users au ON arp.user_id = au.id
  WHERE arp.is_enabled = true
    AND arp.next_reminder_date IS NOT NULL
    AND arp.next_reminder_date <= CURRENT_DATE;
END;
$$;