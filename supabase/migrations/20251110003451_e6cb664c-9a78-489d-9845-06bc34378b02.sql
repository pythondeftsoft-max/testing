-- Skip automatic email creation for invitation notifications
-- These notifications have dedicated edge functions that send properly formatted HTML emails

CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
BEGIN
  -- Skip email creation for invitation notifications
  -- These are handled by dedicated edge functions (send-account-invitation, send-portfolio-invitation)
  -- which send properly formatted HTML emails with buttons and branding
  IF NEW.type IN ('account_invite', 'portfolio_invite') THEN
    RETURN NEW;
  END IF;

  -- Fetch the user's email from profiles
  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Only insert into email_queue if we have a valid email
  IF user_email IS NOT NULL THEN
    INSERT INTO public.email_queue (user_id, to_email, subject, body, link, email_type, audience)
    VALUES (
      NEW.user_id,
      user_email,
      NEW.title,
      CONCAT(NEW.description, ' - ', to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS')),
      COALESCE(NEW.link, '/messages?tab=notifications'),
      'custom',
      'landlord'
    );
  END IF;
  
  RETURN NEW;
END;
$$;