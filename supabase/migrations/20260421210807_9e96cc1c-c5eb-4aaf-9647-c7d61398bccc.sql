-- 1. agency_port_packet_sends table
CREATE TABLE public.agency_port_packet_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packet_id UUID NOT NULL REFERENCES public.agency_port_packets(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  sent_to_email TEXT NOT NULL,
  sent_to_name TEXT,
  sent_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_port_packet_sends_packet ON public.agency_port_packet_sends(packet_id);
CREATE INDEX idx_port_packet_sends_agency ON public.agency_port_packet_sends(agency_id);

ALTER TABLE public.agency_port_packet_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their port packet sends"
ON public.agency_port_packet_sends
FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Agency staff can create port packet sends"
ON public.agency_port_packet_sends
FOR INSERT
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Service role can update port packet sends"
ON public.agency_port_packet_sends
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 2. Add lead_email_id to rfp_packets_sent
ALTER TABLE public.rfp_packets_sent
ADD COLUMN IF NOT EXISTS lead_email_id UUID;

CREATE INDEX IF NOT EXISTS idx_rfp_packets_sent_lead_email ON public.rfp_packets_sent(lead_email_id);

-- 3. Add public_facing to rfp_response_library
ALTER TABLE public.rfp_response_library
ADD COLUMN IF NOT EXISTS public_facing BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_rfp_library_public_facing ON public.rfp_response_library(public_facing) WHERE public_facing = true;

-- Update the existing public read policy to allow filtering by public_facing
-- (existing policy "Anyone can view published RFP entries" already exists; we keep it
--  and let the frontend filter by public_facing for the per-PHA trust page.
--  No policy change needed.)