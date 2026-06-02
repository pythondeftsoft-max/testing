-- Phase 2: Create digital contract system for lease renewals

-- Create lease renewal contracts table
CREATE TABLE public.lease_renewal_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_renewal_id UUID NOT NULL REFERENCES public.lease_renewals(id) ON DELETE CASCADE,
  contract_template TEXT NOT NULL,
  landlord_signature JSONB,
  tenant_signature JSONB,
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  contract_status TEXT NOT NULL DEFAULT 'draft',
  pdf_document_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for lease renewal contracts
ALTER TABLE public.lease_renewal_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can manage contracts for their properties"
ON public.lease_renewal_contracts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lease_renewals lr
    JOIN public.properties p ON lr.property_id = p.id
    WHERE lr.id = lease_renewal_contracts.lease_renewal_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view and sign their contracts"
ON public.lease_renewal_contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lease_renewals lr
    WHERE lr.id = lease_renewal_contracts.lease_renewal_id 
    AND lr.tenant_id = auth.uid()
  )
);

CREATE POLICY "Tenants can update their signature"
ON public.lease_renewal_contracts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lease_renewals lr
    WHERE lr.id = lease_renewal_contracts.lease_renewal_id 
    AND lr.tenant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lease_renewals lr
    WHERE lr.id = lease_renewal_contracts.lease_renewal_id 
    AND lr.tenant_id = auth.uid()
  )
);

-- Create storage bucket for lease contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('lease-contracts', 'lease-contracts', false);

-- Create storage policies for lease contracts
CREATE POLICY "Property owners can manage contracts for their properties"
ON storage.objects
FOR ALL
USING (bucket_id = 'lease-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenants can view their contracts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lease-contracts' 
  AND EXISTS (
    SELECT 1 FROM public.lease_renewal_contracts lrc
    JOIN public.lease_renewals lr ON lrc.lease_renewal_id = lr.id
    WHERE lrc.pdf_document_path = name
    AND lr.tenant_id = auth.uid()
  )
);

-- Create updated_at trigger for contracts
CREATE TRIGGER update_lease_renewal_contracts_updated_at
BEFORE UPDATE ON public.lease_renewal_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add contract status options with validation trigger
CREATE OR REPLACE FUNCTION validate_contract_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_status NOT IN ('draft', 'landlord_signed', 'sent', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid contract status: %', NEW.contract_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_contract_status_trigger
BEFORE INSERT OR UPDATE ON public.lease_renewal_contracts
FOR EACH ROW
EXECUTE FUNCTION validate_contract_status();