
CREATE TYPE public.agency_notification_type AS ENUM (
  'recertification_reminder',
  'inspection_reminder',
  'lease_expiration',
  'voucher_issued',
  'rent_change',
  'hap_expiration'
);

CREATE TABLE public.agency_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  notification_type public.agency_notification_type NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, notification_type)
);

ALTER TABLE public.agency_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view notification preferences"
ON public.agency_notification_preferences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_notification_preferences.agency_id
      AND agency_staff.is_active = true
  )
);

CREATE POLICY "Agency admins can manage notification preferences"
ON public.agency_notification_preferences
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_notification_preferences.agency_id
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_notification_preferences.agency_id
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  )
);

CREATE TRIGGER update_agency_notification_preferences_updated_at
BEFORE UPDATE ON public.agency_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
