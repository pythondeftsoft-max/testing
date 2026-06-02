-- Create RPC function to increment reminder count safely
CREATE OR REPLACE FUNCTION public.increment_reminder_count(reminder_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.asset_reminder_preferences 
  SET reminder_count = reminder_count + 1,
      updated_at = now()
  WHERE id = reminder_id;
END;
$$;