
-- Atomic unread count increment function
CREATE OR REPLACE FUNCTION public.increment_unread_count(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sms_conversations
  SET unread_count = unread_count + 1,
      updated_at = now()
  WHERE id = conv_id;
END;
$$;
