
-- Create agency_contracts table
CREATE TABLE public.agency_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  monthly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  setup_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL DEFAULT 'net-30',
  contract_start DATE,
  contract_end DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','suspended')),
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  po_number TEXT,
  notes TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_contracts ENABLE ROW LEVEL SECURITY;

-- Agency staff can read their own contracts
CREATE POLICY "Agency staff can view own contracts"
  ON public.agency_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_contracts.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

-- Super admins can do everything
CREATE POLICY "Super admins full access on contracts"
  ON public.agency_contracts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE system_admins.user_id = auth.uid()
        AND system_admins.role_name = 'super_admin'
        AND system_admins.is_active = true
    )
  );

-- Create agency_invoices table
CREATE TABLE public.agency_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.agency_contracts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  stripe_invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_invoices ENABLE ROW LEVEL SECURITY;

-- Agency staff can read their own invoices
CREATE POLICY "Agency staff can view own invoices"
  ON public.agency_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_invoices.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

-- Super admins can do everything
CREATE POLICY "Super admins full access on invoices"
  ON public.agency_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE system_admins.user_id = auth.uid()
        AND system_admins.role_name = 'super_admin'
        AND system_admins.is_active = true
    )
  );

-- Add onboarding_completed to housing_authorities
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Timestamp triggers
CREATE TRIGGER update_agency_contracts_updated_at
  BEFORE UPDATE ON public.agency_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_invoices_updated_at
  BEFORE UPDATE ON public.agency_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
