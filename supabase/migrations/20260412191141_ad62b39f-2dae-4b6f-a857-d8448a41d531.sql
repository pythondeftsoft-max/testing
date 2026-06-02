CREATE OR REPLACE FUNCTION public.fn_notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/notify-push',
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'property_id', NEW.property_id,
      'tenant_id', NEW.tenant_id,
      'unit_id', NEW.unit_id,
      'status', NEW.status
    )),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4'
    )
  );
  RETURN NEW;
END;
$$;