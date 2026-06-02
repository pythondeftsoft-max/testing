-- ============================================================
-- 1. MULTI-PROGRAM SUPPORT
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.housing_program_type AS ENUM (
    'hcv', 'public_housing', 'vash', 'ehv', 'mod_rehab', 'project_based'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agency_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  program_type public.housing_program_type NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, program_type)
);

ALTER TABLE public.agency_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own agency programs"
  ON public.agency_programs FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff manage own agency programs"
  ON public.agency_programs FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all agency programs"
  ON public.agency_programs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Add program_type to relevant tables (additive, default 'hcv')
ALTER TABLE public.agency_vouchers
  ADD COLUMN IF NOT EXISTS program_type public.housing_program_type NOT NULL DEFAULT 'hcv';

ALTER TABLE public.agency_recertifications
  ADD COLUMN IF NOT EXISTS program_type public.housing_program_type NOT NULL DEFAULT 'hcv';

ALTER TABLE public.agency_hap_contracts
  ADD COLUMN IF NOT EXISTS program_type public.housing_program_type NOT NULL DEFAULT 'hcv';

ALTER TABLE public.voucher_applications
  ADD COLUMN IF NOT EXISTS program_type public.housing_program_type NOT NULL DEFAULT 'hcv';

CREATE INDEX IF NOT EXISTS idx_agency_vouchers_program ON public.agency_vouchers(agency_id, program_type);
CREATE INDEX IF NOT EXISTS idx_agency_recerts_program ON public.agency_recertifications(agency_id, program_type);
CREATE INDEX IF NOT EXISTS idx_agency_hap_program ON public.agency_hap_contracts(agency_id, program_type);
CREATE INDEX IF NOT EXISTS idx_voucher_apps_program ON public.voucher_applications(program_type);

-- ============================================================
-- 2. DOCUMENT GENERATION ENGINE
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.document_template_category AS ENUM (
    'hap_contract', 'voucher_issuance', 'termination_notice', 'recert_notice',
    'briefing_letter', 'port_out_authorization', 'inspection_notice', 'rfta_approval',
    'general_notice', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agency_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE CASCADE, -- NULL = system default
  name TEXT NOT NULL,
  category public.document_template_category NOT NULL DEFAULT 'general_notice',
  description TEXT,
  body_html TEXT NOT NULL DEFAULT '',
  merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  letterhead_url TEXT,
  footer_text TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view system defaults"
  ON public.agency_document_templates FOR SELECT TO authenticated
  USING (agency_id IS NULL AND is_system_default = true);

CREATE POLICY "Agency staff view own agency templates"
  ON public.agency_document_templates FOR SELECT TO authenticated
  USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff manage own agency templates"
  ON public.agency_document_templates FOR ALL TO authenticated
  USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all templates"
  ON public.agency_document_templates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.agency_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.agency_document_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  category public.document_template_category NOT NULL,
  entity_type TEXT, -- 'tenant' | 'landlord' | 'hap_contract' | 'voucher' | etc.
  entity_id UUID,
  recipient_name TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  merge_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated', -- generated | sent | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own generated docs"
  ON public.agency_generated_documents FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff create own generated docs"
  ON public.agency_generated_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff update own generated docs"
  ON public.agency_generated_documents FOR UPDATE TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins view all generated docs"
  ON public.agency_generated_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_gen_docs_agency ON public.agency_generated_documents(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_docs_entity ON public.agency_generated_documents(entity_type, entity_id);

-- Storage bucket for generated documents (private, agency-folder-scoped)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-generated-docs', 'agency-generated-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agency staff read generated docs in own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'agency-generated-docs'
    AND public.is_agency_staff(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Agency staff upload generated docs to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agency-generated-docs'
    AND public.is_agency_staff(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Service role full access generated docs"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'agency-generated-docs')
  WITH CHECK (bucket_id = 'agency-generated-docs');

-- ============================================================
-- 3. HUD PIC/IMS SUBMISSION TRACKER
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.pic_submission_status AS ENUM (
    'draft', 'uploaded', 'in_review', 'accepted', 'partial', 'rejected', 'resubmitted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agency_pic_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  batch_reference TEXT NOT NULL,
  submission_period TEXT, -- e.g. "2026-Q1" or "2026-04"
  record_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  file_name TEXT,
  status public.pic_submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  hud_response_received_at TIMESTAMPTZ,
  hud_response_summary TEXT,
  error_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_pic_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own PIC submissions"
  ON public.agency_pic_submissions FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff manage own PIC submissions"
  ON public.agency_pic_submissions FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all PIC submissions"
  ON public.agency_pic_submissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pic_subs_agency ON public.agency_pic_submissions(agency_id, created_at DESC);

-- ============================================================
-- 4. GL / ACCOUNTING EXPORT
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.gl_export_format AS ENUM (
    'quickbooks_iif', 'sage_csv', 'generic_csv', 'generic_journal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agency_gl_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  export_name TEXT NOT NULL,
  format public.gl_export_format NOT NULL DEFAULT 'generic_csv',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  source_types TEXT[] NOT NULL DEFAULT ARRAY['hap_batches']::TEXT[], -- hap_batches, tenant_ledger, etc.
  record_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  file_path TEXT,
  file_name TEXT,
  generated_by UUID,
  status TEXT NOT NULL DEFAULT 'completed', -- pending | completed | failed
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_gl_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own GL exports"
  ON public.agency_gl_exports FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff manage own GL exports"
  ON public.agency_gl_exports FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all GL exports"
  ON public.agency_gl_exports FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_gl_exports_agency ON public.agency_gl_exports(agency_id, created_at DESC);

-- ============================================================
-- TIMESTAMP TRIGGERS
-- ============================================================

CREATE TRIGGER update_agency_programs_updated_at
  BEFORE UPDATE ON public.agency_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_doc_templates_updated_at
  BEFORE UPDATE ON public.agency_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_pic_subs_updated_at
  BEFORE UPDATE ON public.agency_pic_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED 8 SYSTEM-DEFAULT HUD DOCUMENT TEMPLATES
-- ============================================================

INSERT INTO public.agency_document_templates (agency_id, name, category, description, body_html, merge_fields, is_system_default)
VALUES
  (NULL, 'HAP Contract (HUD-52641)', 'hap_contract',
   'Standard Housing Assistance Payments contract between PHA and landlord.',
   '<h1>Housing Assistance Payments Contract</h1><p>Contract Number: {{contract_number}}</p><p>This contract is entered into between {{agency_name}} (the "PHA") and {{landlord_name}} (the "Owner") for the unit located at:</p><p><strong>{{property_address}}</strong></p><p><strong>Tenant:</strong> {{tenant_name}}<br/><strong>Lease Start:</strong> {{effective_date}}<br/><strong>Contract Rent:</strong> ${{gross_rent}}<br/><strong>HAP Amount:</strong> ${{hap_amount}}<br/><strong>Tenant Rent:</strong> ${{tenant_rent}}<br/><strong>Bedroom Size:</strong> {{bedroom_count}}</p><p>This contract is effective {{effective_date}} through {{expiration_date}}.</p><p>__________________________<br/>PHA Authorized Representative<br/>Date: ____________</p><p>__________________________<br/>Owner<br/>Date: ____________</p>',
   '["contract_number","agency_name","landlord_name","property_address","tenant_name","effective_date","gross_rent","hap_amount","tenant_rent","bedroom_count","expiration_date"]'::jsonb,
   true),

  (NULL, 'Voucher Issuance Letter', 'voucher_issuance',
   'Letter notifying applicant their voucher has been issued.',
   '<h1>{{agency_name}}</h1><p>Date: {{today}}</p><p>{{tenant_name}}<br/>{{tenant_address}}</p><p>Dear {{tenant_name}},</p><p>Congratulations! You have been issued a Housing Choice Voucher.</p><p><strong>Voucher Number:</strong> {{voucher_number}}<br/><strong>Bedroom Size:</strong> {{bedroom_size}}<br/><strong>Issue Date:</strong> {{issue_date}}<br/><strong>Expiration Date:</strong> {{expiration_date}}</p><p>You have 60 days from the issue date to find a unit. You may request a single 30-day extension if needed.</p><p>Please attend the mandatory briefing on {{briefing_date}} at {{briefing_location}}.</p><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["agency_name","today","tenant_name","tenant_address","voucher_number","bedroom_size","issue_date","expiration_date","briefing_date","briefing_location","caseworker_name"]'::jsonb,
   true),

  (NULL, 'Termination of Assistance Notice', 'termination_notice',
   'Notice of termination of housing assistance with hearing rights.',
   '<h1>NOTICE OF TERMINATION OF ASSISTANCE</h1><p>Date: {{today}}</p><p>{{tenant_name}}<br/>{{tenant_address}}</p><p>Dear {{tenant_name}},</p><p>This letter is to inform you that {{agency_name}} intends to terminate your Housing Choice Voucher assistance effective <strong>{{termination_date}}</strong>.</p><p><strong>Reason for termination:</strong> {{termination_reason}}</p><p><strong>Your right to a hearing:</strong> You have the right to request an informal hearing within 14 days of this notice. To request a hearing, contact {{caseworker_name}} at {{caseworker_phone}} or {{caseworker_email}}.</p><p>If you do not request a hearing, your assistance will be terminated on the date listed above.</p><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["today","tenant_name","tenant_address","agency_name","termination_date","termination_reason","caseworker_name","caseworker_phone","caseworker_email"]'::jsonb,
   true),

  (NULL, 'Annual Recertification Notice', 'recert_notice',
   'Notice that annual recertification is due.',
   '<h1>{{agency_name}}</h1><p>Date: {{today}}</p><p>{{tenant_name}}<br/>{{tenant_address}}</p><p>Dear {{tenant_name}},</p><p>Your annual recertification is due on <strong>{{recert_due_date}}</strong>.</p><p>Please complete and return the attached forms along with the following documents by {{document_due_date}}:</p><ul><li>Proof of all household income (pay stubs, benefit letters)</li><li>Photo ID for all household members 18+</li><li>Updated household composition</li><li>Most recent bank statements</li></ul><p>Failure to complete recertification by the due date may result in termination of your housing assistance.</p><p>Schedule your interview by calling {{caseworker_phone}}.</p><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["agency_name","today","tenant_name","tenant_address","recert_due_date","document_due_date","caseworker_phone","caseworker_name"]'::jsonb,
   true),

  (NULL, 'Voucher Briefing Letter', 'briefing_letter',
   'Invitation to mandatory voucher briefing session.',
   '<h1>{{agency_name}} — Voucher Briefing</h1><p>Date: {{today}}</p><p>Dear {{tenant_name}},</p><p>You are invited to attend a <strong>mandatory</strong> Housing Choice Voucher briefing session.</p><p><strong>Date:</strong> {{briefing_date}}<br/><strong>Time:</strong> {{briefing_time}}<br/><strong>Location:</strong> {{briefing_location}}</p><p>At this briefing, you will receive your voucher, learn how the program works, your responsibilities, how to find a unit, and how to request a unit be approved.</p><p>If you cannot attend, please contact {{caseworker_phone}} immediately to reschedule. Failure to attend without rescheduling will result in withdrawal of your voucher.</p><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["agency_name","today","tenant_name","briefing_date","briefing_time","briefing_location","caseworker_phone","caseworker_name"]'::jsonb,
   true),

  (NULL, 'Port-Out Authorization (HUD-52665)', 'port_out_authorization',
   'Authorization for tenant to port voucher to receiving PHA.',
   '<h1>PORTABILITY AUTHORIZATION</h1><p>Date: {{today}}</p><p><strong>Initial PHA:</strong> {{agency_name}}<br/><strong>Receiving PHA:</strong> {{receiving_pha_name}}</p><p><strong>Tenant:</strong> {{tenant_name}}<br/><strong>Voucher Number:</strong> {{voucher_number}}<br/><strong>Bedroom Size:</strong> {{bedroom_size}}<br/><strong>Family Composition:</strong> {{family_size}} members</p><p>The above family is in good standing with this PHA and is hereby authorized to port their voucher to your jurisdiction effective {{port_effective_date}}.</p><p>Initial lease-up date: {{initial_lease_date}}<br/>Annual recertification due: {{annual_recert_date}}</p><p>Please absorb or bill back as per your standard procedures. Contact {{caseworker_name}} at {{caseworker_phone}} with any questions.</p><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["today","agency_name","receiving_pha_name","tenant_name","voucher_number","bedroom_size","family_size","port_effective_date","initial_lease_date","annual_recert_date","caseworker_name","caseworker_phone"]'::jsonb,
   true),

  (NULL, 'Annual Inspection Notice', 'inspection_notice',
   'Notice scheduling annual HQS/NSPIRE inspection.',
   '<h1>{{agency_name}} — Inspection Notice</h1><p>Date: {{today}}</p><p>{{tenant_name}}<br/>{{tenant_address}}</p><p>Dear {{tenant_name}},</p><p>Your unit is scheduled for an annual inspection.</p><p><strong>Date:</strong> {{inspection_date}}<br/><strong>Time Window:</strong> {{inspection_time}}<br/><strong>Inspector:</strong> {{inspector_name}}</p><p>Please ensure an adult 18+ is present and that the inspector has access to all rooms, including bedrooms, bathrooms, kitchen, and any storage areas.</p><p>If you need to reschedule, contact us at least 48 hours in advance at {{caseworker_phone}}.</p><p>Sincerely,<br/>{{agency_name}}</p>',
   '["agency_name","today","tenant_name","tenant_address","inspection_date","inspection_time","inspector_name","caseworker_phone"]'::jsonb,
   true),

  (NULL, 'RFTA Approval Letter', 'rfta_approval',
   'Approval of Request for Tenancy Approval.',
   '<h1>{{agency_name}}</h1><p>Date: {{today}}</p><p>{{landlord_name}}<br/>RE: {{property_address}}</p><p>Dear {{landlord_name}},</p><p>Your Request for Tenancy Approval (RFTA) for the unit at {{property_address}} has been <strong>APPROVED</strong>.</p><p><strong>Tenant:</strong> {{tenant_name}}<br/><strong>Approved Contract Rent:</strong> ${{gross_rent}}<br/><strong>HAP Portion:</strong> ${{hap_amount}}<br/><strong>Tenant Portion:</strong> ${{tenant_rent}}<br/><strong>Effective Date:</strong> {{effective_date}}</p><p>Next steps:</p><ol><li>An inspection will be scheduled within 5 business days</li><li>Once the unit passes inspection, the HAP contract will be executed</li><li>HAP payments begin on the lease effective date</li></ol><p>Sincerely,<br/>{{caseworker_name}}<br/>{{agency_name}}</p>',
   '["agency_name","today","landlord_name","property_address","tenant_name","gross_rent","hap_amount","tenant_rent","effective_date","caseworker_name"]'::jsonb,
   true)
ON CONFLICT DO NOTHING;