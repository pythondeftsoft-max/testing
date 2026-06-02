-- Create scheduled reports table
CREATE TABLE public.agency_scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  schedule_cron TEXT NOT NULL DEFAULT '0 8 1 * *',
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their scheduled reports"
  ON public.agency_scheduled_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.agency_id = agency_scheduled_reports.agency_id
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency admins can manage scheduled reports"
  ON public.agency_scheduled_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.agency_id = agency_scheduled_reports.agency_id
        AND agency_staff.role = 'agency_admin'
        AND agency_staff.is_active = true
    )
  );

-- Add missing tab permissions for all existing roles
INSERT INTO public.agency_role_permissions (role_name, tab_name, can_view, can_edit, can_create, can_delete)
SELECT r.role_name, t.tab_name,
  CASE WHEN r.role_name = 'agency_admin' THEN true
       WHEN r.role_name = 'finance' AND t.tab_name = 'hap_batching' THEN true
       WHEN r.role_name = 'executive_director' THEN true
       ELSE false END,
  CASE WHEN r.role_name = 'agency_admin' THEN true
       WHEN r.role_name = 'finance' AND t.tab_name = 'hap_batching' THEN true
       ELSE false END,
  CASE WHEN r.role_name = 'agency_admin' THEN true ELSE false END,
  CASE WHEN r.role_name = 'agency_admin' THEN true ELSE false END
FROM (SELECT DISTINCT role_name FROM public.agency_role_permissions) r
CROSS JOIN (VALUES ('hap_batching'),('rent_calc'),('notices'),('comms'),('audit_trail'),('settings')) AS t(tab_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_role_permissions arp
  WHERE arp.role_name = r.role_name AND arp.tab_name = t.tab_name
);