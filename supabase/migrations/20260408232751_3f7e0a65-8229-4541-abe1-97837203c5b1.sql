
-- Enable pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires the notify-push edge function
CREATE OR REPLACE FUNCTION public.fn_notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _anon_key text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  _anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Fall back to vault secrets if app.settings not available
  IF _url IS NULL THEN
    SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  END IF;
  IF _anon_key IS NULL THEN
    SELECT decrypted_secret INTO _anon_key FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1;
  END IF;

  PERFORM extensions.http_post(
    url := _url || '/functions/v1/notify-push',
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'property_id', NEW.property_id,
      'tenant_id', NEW.tenant_id,
      'unit_id', NEW.unit_id,
      'status', NEW.status
    )),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on property_pushes
DROP TRIGGER IF EXISTS trg_notify_push_on_insert ON public.property_pushes;
CREATE TRIGGER trg_notify_push_on_insert
  AFTER INSERT ON public.property_pushes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_push_on_insert();
