-- Fix the base64url encoding issue in generate_invitation_token function
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  raw_token text;
BEGIN
  -- Use regular base64 encoding since base64url is not supported
  raw_token := encode(gen_random_bytes(32), 'base64');
  
  -- Manually replace characters to make it URL-safe
  -- Replace + with - and / with _
  raw_token := replace(replace(raw_token, '+', '-'), '/', '_');
  
  -- Remove padding = characters
  raw_token := replace(raw_token, '=', '');
  
  RETURN raw_token;
END;
$function$;