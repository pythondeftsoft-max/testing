-- Portability requests table
CREATE TABLE public.agency_portability_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('port_out', 'port_in')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','paperwork_sent','paperwork_received','searching','leased','absorbed','billed','returned','expired','cancelled')),
  billing_arrangement TEXT CHECK (billing_arrangement IN ('absorbed','billed')),
  
  tenant_id UUID,
  voucher_id UUID REFERENCES public.agency_vouchers(id) ON DELETE SET NULL,
  hap_contract_id UUID REFERENCES public.agency_hap_contracts(id) ON DELETE SET NULL,
  
  initial_pha_code TEXT,
  initial_pha_name TEXT,
  initial_pha_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  receiving_pha_code TEXT,
  receiving_pha_name TEXT,
  receiving_pha_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  
  voucher_issuance_date DATE,
  search_expiration_date DATE,
  lease_date DATE,
  
  bedroom_size INTEGER,
  hap_amount NUMERIC(10,2),
  contract_rent NUMERIC(10,2),
  utility_allowance NUMERIC(10,2),
  admin_fee NUMERIC(10,2),
  
  hud52665_url TEXT,
  hud52665b_url TEXT,
  
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  notes TEXT,
  internal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portability_agency ON public.agency_portability_requests(agency_id);
CREATE INDEX idx_portability_status ON public.agency_portability_requests(status);
CREATE INDEX idx_portability_type ON public.agency_portability_requests(request_type);
CREATE INDEX idx_portability_tenant ON public.agency_portability_requests(tenant_id);
CREATE INDEX idx_portability_search_exp ON public.agency_portability_requests(search_expiration_date) WHERE status IN ('initiated','paperwork_sent','paperwork_received','searching');

ALTER TABLE public.agency_portability_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage portability requests"
ON public.agency_portability_requests
FOR ALL
USING (public.is_agency_staff(auth.uid(), agency_id))
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Tenants view their own portability"
ON public.agency_portability_requests
FOR SELECT
USING (tenant_id = auth.uid());

CREATE TRIGGER trg_portability_updated
BEFORE UPDATE ON public.agency_portability_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Portability billing table
CREATE TABLE public.agency_portability_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portability_id UUID NOT NULL REFERENCES public.agency_portability_requests(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  
  billing_period_month DATE NOT NULL,
  hap_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  admin_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) GENERATED ALWAYS AS (hap_amount + admin_fee) STORED,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invoiced','paid','overdue','cancelled')),
  invoice_number TEXT,
  invoice_url TEXT,
  invoiced_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_reference TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (portability_id, billing_period_month)
);

CREATE INDEX idx_portability_billing_agency ON public.agency_portability_billing(agency_id);
CREATE INDEX idx_portability_billing_status ON public.agency_portability_billing(status);
CREATE INDEX idx_portability_billing_period ON public.agency_portability_billing(billing_period_month);

ALTER TABLE public.agency_portability_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage portability billing"
ON public.agency_portability_billing
FOR ALL
USING (public.is_agency_staff(auth.uid(), agency_id))
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_portability_billing_updated
BEFORE UPDATE ON public.agency_portability_billing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log trigger for status changes
CREATE OR REPLACE FUNCTION public.log_portability_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.agency_activity_log (agency_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      NEW.agency_id,
      'portability_request',
      NEW.id,
      'status_changed',
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'request_type', NEW.request_type)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_activity_log (agency_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      NEW.agency_id,
      'portability_request',
      NEW.id,
      'created',
      auth.uid(),
      jsonb_build_object('request_type', NEW.request_type, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portability_audit
AFTER INSERT OR UPDATE ON public.agency_portability_requests
FOR EACH ROW EXECUTE FUNCTION public.log_portability_status_change();