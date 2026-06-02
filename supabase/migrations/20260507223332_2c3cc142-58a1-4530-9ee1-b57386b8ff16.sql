ALTER TABLE public.agency_pic_submissions
  ADD COLUMN IF NOT EXISTS transmitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS transmit_status text,
  ADD COLUMN IF NOT EXISTS transmit_log text;

CREATE TABLE IF NOT EXISTS public.agency_pic_settings (
  agency_id uuid PRIMARY KEY,
  sftp_host_override text,
  sftp_user_override text,
  sftp_key_secret_name text,
  auto_transmit boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.agency_pic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency staff can read pic settings" ON public.agency_pic_settings;
CREATE POLICY "Agency staff can read pic settings"
ON public.agency_pic_settings FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency admins can write pic settings" ON public.agency_pic_settings;
CREATE POLICY "Agency admins can write pic settings"
ON public.agency_pic_settings FOR ALL
USING (public.has_agency_role(auth.uid(), 'agency_admin'::agency_role) OR public.is_admin(auth.uid()))
WITH CHECK (public.has_agency_role(auth.uid(), 'agency_admin'::agency_role) OR public.is_admin(auth.uid()));

ALTER TABLE public.hap_disbursements
  ADD COLUMN IF NOT EXISTS stop_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS stop_status text,
  ADD COLUMN IF NOT EXISTS is_reissue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reissued_from_line_id uuid;