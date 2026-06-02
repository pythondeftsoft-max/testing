-- Add the missing trigger to enforce application limits
CREATE TRIGGER enforce_application_limit_trigger
  BEFORE INSERT ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_weekly_application_limit();