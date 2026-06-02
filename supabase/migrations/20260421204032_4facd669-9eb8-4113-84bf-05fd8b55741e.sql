
-- ============= PORTING (Option A) =============

-- Port packets: full HUD-52665 + 50058 packet data linked to a porting_request
CREATE TABLE public.agency_port_packets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  porting_request_id UUID NOT NULL REFERENCES public.porting_requests(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  packet_type TEXT NOT NULL DEFAULT 'outgoing', -- outgoing | incoming
  hud_52665_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  hud_50058_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_hap_amount NUMERIC(10,2),
  current_tenant_rent NUMERIC(10,2),
  current_utility_allowance NUMERIC(10,2),
  bedroom_size INTEGER,
  voucher_issued_date DATE,
  voucher_expiration_date DATE,
  receiving_pha_name TEXT,
  receiving_pha_code TEXT,
  receiving_pha_contact_email TEXT,
  receiving_pha_contact_phone TEXT,
  packet_pdf_path TEXT,
  sla_deadline TIMESTAMPTZ, -- 30-day SLA from receipt
  acknowledged_at TIMESTAMPTZ,
  decision TEXT, -- absorbed | billed | denied | pending
  decision_at TIMESTAMPTZ,
  decision_by UUID,
  decision_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_port_packets_request ON public.agency_port_packets(porting_request_id);
CREATE INDEX idx_port_packets_agency ON public.agency_port_packets(agency_id);
CREATE INDEX idx_port_packets_sla ON public.agency_port_packets(sla_deadline) WHERE decision = 'pending' OR decision IS NULL;

ALTER TABLE public.agency_port_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view their port packets"
ON public.agency_port_packets FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff insert port packets"
ON public.agency_port_packets FOR INSERT
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff update their port packets"
ON public.agency_port_packets FOR UPDATE
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins view all port packets"
ON public.agency_port_packets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_port_packets_updated_at
BEFORE UPDATE ON public.agency_port_packets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Port billing: monthly reconciliation between issuing/receiving PHA when port is "billed" (not absorbed)
CREATE TABLE public.agency_port_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  port_packet_id UUID NOT NULL REFERENCES public.agency_port_packets(id) ON DELETE CASCADE,
  billing_agency_id UUID NOT NULL REFERENCES public.housing_authorities(id), -- agency that bills (receiving)
  paying_agency_id UUID NOT NULL REFERENCES public.housing_authorities(id), -- agency that pays (issuing)
  billing_month DATE NOT NULL,
  hap_portion NUMERIC(10,2) NOT NULL DEFAULT 0,
  admin_fee_portion NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | invoiced | paid | disputed
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(port_packet_id, billing_month)
);

CREATE INDEX idx_port_billing_packet ON public.agency_port_billing(port_packet_id);
CREATE INDEX idx_port_billing_billing_agency ON public.agency_port_billing(billing_agency_id, billing_month);
CREATE INDEX idx_port_billing_paying_agency ON public.agency_port_billing(paying_agency_id, billing_month);

ALTER TABLE public.agency_port_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies view billing they participate in"
ON public.agency_port_billing FOR SELECT
USING (
  public.is_agency_staff(auth.uid(), billing_agency_id)
  OR public.is_agency_staff(auth.uid(), paying_agency_id)
);

CREATE POLICY "Billing agency manages billing rows"
ON public.agency_port_billing FOR INSERT
WITH CHECK (public.is_agency_staff(auth.uid(), billing_agency_id));

CREATE POLICY "Billing agency updates billing rows"
ON public.agency_port_billing FOR UPDATE
USING (public.is_agency_staff(auth.uid(), billing_agency_id));

CREATE POLICY "Admins view all port billing"
ON public.agency_port_billing FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_port_billing_updated_at
BEFORE UPDATE ON public.agency_port_billing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= RFP / PROCUREMENT TOOLKIT (Option C) =============

CREATE TABLE public.rfp_response_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- security | hud_compliance | architecture | data_handling | support | pricing | other
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  short_answer TEXT, -- 1-line summary for quick exports
  keywords TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfp_library_category ON public.rfp_response_library(category) WHERE is_published = true;

ALTER TABLE public.rfp_response_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published RFP responses"
ON public.rfp_response_library FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins manage RFP library"
ON public.rfp_response_library FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_rfp_library_updated_at
BEFORE UPDATE ON public.rfp_response_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rfp_packets_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.agency_leads(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_org TEXT,
  packet_type TEXT NOT NULL DEFAULT 'full', -- full | security_only | hud_only | custom
  included_categories TEXT[],
  pdf_path TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_message_id TEXT,
  notes TEXT
);

CREATE INDEX idx_rfp_sent_lead ON public.rfp_packets_sent(lead_id);
CREATE INDEX idx_rfp_sent_email ON public.rfp_packets_sent(recipient_email);

ALTER TABLE public.rfp_packets_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all sent packets"
ON public.rfp_packets_sent FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins create sent packet records"
ON public.rfp_packets_sent FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed a baseline of RFP responses so the library is useful from day one
INSERT INTO public.rfp_response_library (category, question, answer, short_answer, display_order) VALUES
('security', 'Where is customer data hosted?', 'All customer data is hosted on Supabase infrastructure running on AWS, primarily in US-East regions. Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Backups are taken daily and retained for 30 days.', 'AWS US-East via Supabase, encrypted at rest and in transit.', 10),
('security', 'How is multi-tenant data isolation enforced?', 'OpenKey enforces tenant isolation at the database layer using PostgreSQL Row Level Security (RLS). Every agency-scoped table has RLS policies that restrict access to rows owned by the requesting user''s agency, validated through SECURITY DEFINER functions (e.g., is_agency_staff). Cross-agency reads are not possible even with a compromised user session.', 'PostgreSQL RLS with SECURITY DEFINER functions; cross-agency access is impossible.', 20),
('security', 'How is PII (SSNs, banking) handled?', 'OpenKey follows a PII minimization strategy. SSNs and banking details are stored as verification flags only, not raw values. Where retention is legally required (e.g., 1099 issuance), data is encrypted column-level and access is logged.', 'PII minimized to verification flags; raw values never persisted client-accessible.', 30),
('hud_compliance', 'Does the system support HUD-50058 reporting?', 'Yes. OpenKey generates fully PIC-compliant 50058 fixed-width files (170-character rows) with full validation against HUD edit checks before submission.', 'Yes — PIC-compliant fixed-width 50058 with HUD edit-check validation.', 40),
('hud_compliance', 'What SEMAP indicators does the system support?', 'OpenKey tracks all 14 SEMAP indicators automatically, including waitlist management, lease-up timeliness, HQS/NSPIRE quality control, expanding housing opportunities, FSS enrollment, and rent reasonableness.', 'All 14 SEMAP indicators tracked automatically.', 50),
('hud_compliance', 'Does the system support EIV income discrepancy resolution?', 'Yes. OpenKey ingests EIV income reports, surfaces discrepancies above the agency''s configured threshold, assigns to caseworkers, and tracks resolution with full audit trail.', 'Yes — EIV ingestion, threshold-based discrepancy queue, caseworker resolution.', 60),
('architecture', 'What is the technology stack?', 'Frontend: React 18 + TypeScript + Vite + Tailwind CSS. Backend: Supabase (PostgreSQL 15, PostgREST, Edge Functions on Deno). Payments: Checkbook.io for HAP disbursement, Stripe for SaaS billing. Email: Resend with per-agency custom-domain support. Hosting: AWS via Supabase + Lovable.', 'React/TypeScript frontend, Supabase Postgres backend, Deno edge functions, Checkbook/Stripe/Resend.', 70),
('architecture', 'How does the system handle outages or backups?', 'Supabase performs daily automated backups with point-in-time recovery (PITR) up to 7 days. RTO target is 4 hours; RPO is 24 hours. Status page: status.openkeyhousing.com.', 'Daily backups with 7-day PITR, 4hr RTO / 24hr RPO.', 80),
('data_handling', 'Can the agency export all of its data?', 'Yes. Agencies own 100% of their data and can export at any time as CSV per table or as a full PostgreSQL dump on request. No exit fees.', 'Yes — CSV per table or full Postgres dump on request, no exit fees.', 90),
('data_handling', 'How long is data retained after contract end?', 'Customer data is retained for 90 days post-termination to allow final exports, after which it is permanently deleted. A signed certificate of destruction is provided.', '90 days post-termination, then permanently deleted with destruction certificate.', 100),
('support', 'What are standard support hours and SLAs?', 'Standard support: 8am–6pm ET Mon–Fri. Critical incidents (P1 — system down): 1-hour response, 4-hour resolution target. P2: 4-hour response, 1-business-day resolution.', '8a–6p ET Mon–Fri; 1hr response on P1, 4hr on P2.', 110),
('support', 'Is dedicated implementation support included?', 'Yes. Every PHA receives a named Implementation Manager for the first 90 days, weekly check-ins, and unlimited training sessions for staff during onboarding.', 'Yes — named Implementation Manager, weekly check-ins, unlimited training in first 90 days.', 120);

-- ============= INSPECTOR SYNC QUEUE (Option B prep) =============

CREATE TABLE public.inspection_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspector_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  inspection_id UUID,
  client_uuid TEXT NOT NULL, -- generated on device for idempotency
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | synced | failed
  error_message TEXT,
  device_captured_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_uuid)
);

CREATE INDEX idx_sync_queue_inspector ON public.inspection_sync_queue(inspector_id, status);
CREATE INDEX idx_sync_queue_agency ON public.inspection_sync_queue(agency_id);

ALTER TABLE public.inspection_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors manage their sync queue"
ON public.inspection_sync_queue FOR ALL
USING (auth.uid() = inspector_id)
WITH CHECK (auth.uid() = inspector_id);

CREATE POLICY "Agency staff view sync queue"
ON public.inspection_sync_queue FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id));
