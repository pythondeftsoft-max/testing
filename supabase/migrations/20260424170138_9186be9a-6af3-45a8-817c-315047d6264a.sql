-- 1. Additive columns on property_pushes
ALTER TABLE public.property_pushes
  ADD COLUMN IF NOT EXISTS sms_conversation_id uuid REFERENCES public.sms_conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sms_message_id uuid REFERENCES public.sms_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_property_pushes_sms_conversation
  ON public.property_pushes(sms_conversation_id);

CREATE INDEX IF NOT EXISTS idx_property_pushes_status_created
  ON public.property_pushes(status, created_at DESC);

-- 2. Trigger function: detect positive replies and flag the linked push
CREATE OR REPLACE FUNCTION public.mark_push_interested_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_positive boolean;
BEGIN
  -- Only inbound (from tenant) messages
  IF NEW.direction <> 'inbound' THEN
    RETURN NEW;
  END IF;

  is_positive := NEW.body ~* '\m(yes|y|interested|tour|sure|ok|okay|yeah|yep|yup|yess)\M';

  IF NOT is_positive THEN
    RETURN NEW;
  END IF;

  -- Update the most-recent push tied to this conversation
  UPDATE public.property_pushes
  SET status = 'tenant_interested',
      interested_at = COALESCE(interested_at, now())
  WHERE id = (
    SELECT id FROM public.property_pushes
    WHERE sms_conversation_id = NEW.conversation_id
      AND status NOT IN ('tenant_interested', 'lease_signed', 'declined')
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_interest_detect ON public.sms_messages;
CREATE TRIGGER trg_push_interest_detect
  AFTER INSERT ON public.sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_push_interested_on_reply();