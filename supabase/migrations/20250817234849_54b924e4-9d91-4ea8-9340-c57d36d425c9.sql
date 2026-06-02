-- Drop and recreate function with correct parameter name
DROP FUNCTION IF EXISTS public.sanitize_metadata(jsonb);

CREATE OR REPLACE FUNCTION public.sanitize_metadata(input_metadata JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY['email', 'token', 'authorization', 'password', 'set-cookie', 'cookie', 'api_key', 'secret', 'bearer'];
  sanitized JSONB := input_metadata;
  key TEXT;
BEGIN
  -- Remove or mask sensitive keys
  FOREACH key IN ARRAY sensitive_keys
  LOOP
    IF sanitized ? key THEN
      sanitized := sanitized - key || jsonb_build_object(key, '[REDACTED]');
    END IF;
  END LOOP;
  
  RETURN sanitized;
END;
$$;