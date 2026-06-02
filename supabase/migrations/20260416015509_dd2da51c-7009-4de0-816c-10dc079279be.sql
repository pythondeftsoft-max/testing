
-- ============================================================
-- MODULE 1: Tenant Ledger / Accounts Receivable
-- ============================================================
CREATE TABLE public.agency_tenant_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                          -- e.g. '2026-04'
  entry_type TEXT NOT NULL DEFAULT 'charge',    -- charge, payment, adjustment, repayment
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  reference_id UUID,                            -- optional FK to hap_batch_item, rent_calc, etc.
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_tenant_ledger_agency ON public.agency_tenant_ledger(agency_id);
CREATE INDEX idx_agency_tenant_ledger_tenant ON public.agency_tenant_ledger(tenant_id);
CREATE INDEX idx_agency_tenant_ledger_month ON public.agency_tenant_ledger(month);

ALTER TABLE public.agency_tenant_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage tenant ledger"
  ON public.agency_tenant_ledger FOR ALL
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Tenants can view own ledger"
  ON public.agency_tenant_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = tenant_id);

-- ============================================================
-- MODULE 3: Calendar / Scheduling Engine
-- ============================================================
CREATE TABLE public.agency_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'custom',    -- inspection, recertification, hearing, custom
  entity_id UUID,                               -- FK to the related record
  entity_type TEXT,                             -- inspection, recertification, hearing, tenant, unit
  staff_id UUID REFERENCES public.agency_staff(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',     -- scheduled, completed, cancelled, rescheduled
  recurrence_rule TEXT,                         -- iCal RRULE for recurring events
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_calendar_agency ON public.agency_calendar_events(agency_id);
CREATE INDEX idx_agency_calendar_staff ON public.agency_calendar_events(staff_id);
CREATE INDEX idx_agency_calendar_scheduled ON public.agency_calendar_events(scheduled_at);
CREATE INDEX idx_agency_calendar_type ON public.agency_calendar_events(event_type);

ALTER TABLE public.agency_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage calendar events"
  ON public.agency_calendar_events FOR ALL
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

-- ============================================================
-- MODULE 6: Work Orders / Maintenance Tracking
-- ============================================================
CREATE TABLE public.agency_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.property_units(id),
  tenant_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',       -- low, normal, high, urgent
  status TEXT NOT NULL DEFAULT 'submitted',      -- submitted, assigned, in_progress, completed, cancelled
  assigned_to UUID REFERENCES public.agency_staff(id),
  photos TEXT[],
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_work_orders_agency ON public.agency_work_orders(agency_id);
CREATE INDEX idx_agency_work_orders_tenant ON public.agency_work_orders(tenant_id);
CREATE INDEX idx_agency_work_orders_status ON public.agency_work_orders(status);

ALTER TABLE public.agency_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage work orders"
  ON public.agency_work_orders FOR ALL
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Tenants can view own work orders"
  ON public.agency_work_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can submit work orders"
  ON public.agency_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

-- ============================================================
-- MODULE 7: Audit Trail (Immutable Change Log)
-- ============================================================
CREATE TABLE public.agency_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,                          -- insert, update, delete
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_audit_log_agency ON public.agency_audit_log(agency_id);
CREATE INDEX idx_agency_audit_log_actor ON public.agency_audit_log(actor_id);
CREATE INDEX idx_agency_audit_log_table ON public.agency_audit_log(table_name);
CREATE INDEX idx_agency_audit_log_created ON public.agency_audit_log(created_at);

ALTER TABLE public.agency_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view audit log"
  ON public.agency_audit_log FOR SELECT
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- Trigger function for auto-logging changes on key agency tables
CREATE OR REPLACE FUNCTION public.fn_agency_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
  v_action TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  v_action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_agency_id := OLD.agency_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_agency_id := NEW.agency_id;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_agency_id := NEW.agency_id;
  END IF;

  INSERT INTO public.agency_audit_log (agency_id, actor_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    v_agency_id,
    auth.uid(),
    lower(v_action),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old,
    v_new
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach audit triggers to key agency tables
CREATE TRIGGER audit_agency_hap_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_hap_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_audit_trigger();

CREATE TRIGGER audit_agency_tenant_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_tenant_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_audit_trigger();

CREATE TRIGGER audit_agency_vouchers
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_audit_trigger();

CREATE TRIGGER audit_agency_recertifications
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_recertifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_audit_trigger();

CREATE TRIGGER audit_agency_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_audit_trigger();

-- Updated_at triggers
CREATE TRIGGER update_agency_tenant_ledger_updated_at
  BEFORE UPDATE ON public.agency_tenant_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_calendar_events_updated_at
  BEFORE UPDATE ON public.agency_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_work_orders_updated_at
  BEFORE UPDATE ON public.agency_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
