
-- Additive: ensure pay_ready exists
ALTER TABLE public.agency_landlords ADD COLUMN IF NOT EXISTS pay_ready BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.notify_landlord_enrollment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_name TEXT;
  v_agency_email TEXT;
  v_subject TEXT;
  v_body TEXT;
  v_template TEXT;
BEGIN
  -- Resolve branded from-address
  SELECT name, email INTO v_agency_name, v_agency_email
  FROM public.housing_authorities WHERE id = NEW.agency_id;

  -- 1) Approval: pending_review/invited -> active
  IF NEW.onboarding_status::text = 'active'
     AND COALESCE(OLD.onboarding_status::text, '') <> 'active' THEN
    v_subject := 'You''re approved with ' || COALESCE(v_agency_name, 'your housing authority');
    v_body := 'Hi ' || NEW.landlord_name || E',\n\nGreat news — you''ve been approved as a participating landlord with '
              || COALESCE(v_agency_name, 'the housing authority')
              || E'.\n\nNext steps: confirm your W-9, connect your payout method, and add your property addresses so HAP payments can begin.\n\nLog in to your landlord portal to continue.';
    v_template := 'landlord_enrollment_approved';

  -- 2) W-9 needs attention: was submitted, now back to pending
  ELSIF NEW.w9_status::text = 'pending'
        AND COALESCE(OLD.w9_status::text, '') = 'submitted' THEN
    v_subject := 'Action needed: please re-upload your W-9';
    v_body := 'Hi ' || NEW.landlord_name || E',\n\nYour W-9 needs another look. Please log in and re-upload an updated W-9 so we can finish setting you up for HAP payments.';
    v_template := 'landlord_w9_action_needed';

  -- 3) Pay-Ready flipped on
  ELSIF NEW.pay_ready = true AND COALESCE(OLD.pay_ready, false) = false THEN
    v_subject := 'You''re Pay-Ready — HAP payments enabled';
    v_body := 'Hi ' || NEW.landlord_name || E',\n\nYou are now fully set up to receive HAP payments from '
              || COALESCE(v_agency_name, 'the housing authority')
              || E'. Future disbursements will route to your connected payout method automatically.';
    v_template := 'landlord_pay_ready';
  ELSE
    RETURN NEW;
  END IF;

  -- Enqueue email (non-fatal if queue insert fails)
  BEGIN
    INSERT INTO public.email_queue (user_id, subject, body, to_email, status, template_slug, category, metadata)
    VALUES (
      NEW.landlord_id,
      v_subject,
      v_body,
      NEW.landlord_email,
      'pending',
      v_template,
      'landlord_enrollment',
      jsonb_build_object('agency_id', NEW.agency_id, 'from_email', v_agency_email, 'from_name', v_agency_name)
    );
  EXCEPTION WHEN OTHERS THEN
    -- swallow, never block enrollment update
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_landlord_enrollment_change ON public.agency_landlords;
CREATE TRIGGER trg_landlord_enrollment_change
AFTER UPDATE ON public.agency_landlords
FOR EACH ROW
WHEN (
  OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status
  OR OLD.w9_status IS DISTINCT FROM NEW.w9_status
  OR OLD.pay_ready IS DISTINCT FROM NEW.pay_ready
)
EXECUTE FUNCTION public.notify_landlord_enrollment_change();
