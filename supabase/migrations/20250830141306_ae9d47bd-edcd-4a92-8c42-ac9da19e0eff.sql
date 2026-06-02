
-- 1) Create enum for audience if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_audience_type') THEN
    CREATE TYPE public.email_audience_type AS ENUM ('tenant', 'landlord', 'all');
  END IF;
END$$;

-- 2) Extend email_queue for templating, audience targeting, and contextual data
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS audience public.email_audience_type DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS template_slug text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS to_email text;

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_template_slug ON public.email_queue(template_slug);

-- 3) Email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  audience public.email_audience_type NOT NULL DEFAULT 'tenant',
  category text,
  subject_template text NOT NULL,
  preheader text,
  html_template text NOT NULL,
  default_cta_text text,
  default_cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) RLS: admins manage/read templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read email templates" ON public.email_templates;
CREATE POLICY "Admins can read email templates"
  ON public.email_templates
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 5) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER set_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6) Seed a tenant-targeted template (idempotent)
INSERT INTO public.email_templates (
  name, slug, audience, category, subject_template, preheader, html_template, default_cta_text, default_cta_url, is_active
)
SELECT
  'Tenant Property Match',
  'tenant_property_match',
  'tenant'::public.email_audience_type,
  'property',
  'New Property Match: {{property_address}}',
  'A property matched your preferences. Review the details.',
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827;"><tr><td align="center" style="background:linear-gradient(135deg,#6D5EF6,#5B5CE6); padding:32px 16px; color:#fff; font-weight:700; font-size:24px; border-radius:8px 8px 0 0;">OpenKey</td></tr><tr><td style="padding:24px; background:#ffffff; border:1px solid #e5e7eb; border-top:none;"><h1 style="margin:0 0 12px; font-size:22px; color:#111827;">New Property Match</h1><p style="margin:0 0 16px; color:#4b5563;">Hi {{tenant_name}}, we found a property that matches your preferences.</p><div style="padding:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; margin:12px 0;"><div style="font-weight:600; color:#1f2937; margin-bottom:4px;">📍 {{property_address}}</div><div style="font-weight:700; color:#10b981; font-size:18px;">${{property_rent}}/month</div></div><div style="text-align:center; margin:20px 0;"><a href="{{property_url}}" style="background:#5B5CE6; color:#fff; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:600;">View Property</a></div><p style="margin:16px 0 0; color:#6b7280; font-size:13px;">This match was selected by our team based on your housing profile.</p></td></tr><tr><td align="center" style="background:#f3f4f6; padding:16px; color:#6b7280; font-size:12px; border-radius:0 0 8px 8px;">© OpenKey • Helping tenants find great homes</td></tr></table>',
  'View Property',
  '{{property_url}}',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug = 'tenant_property_match');
