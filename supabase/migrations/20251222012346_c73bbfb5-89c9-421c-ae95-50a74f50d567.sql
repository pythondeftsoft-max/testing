-- Create match_proposals table for admin-driven matching system
CREATE TABLE public.match_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Status flow: pending_tenant -> tenant_interested/tenant_declined -> pending_landlord -> landlord_approved/landlord_denied
  status TEXT NOT NULL DEFAULT 'pending_tenant' CHECK (status IN (
    'pending_tenant',
    'tenant_interested', 
    'tenant_declined',
    'pending_landlord',
    'landlord_approved',
    'landlord_denied',
    'expired',
    'cancelled'
  )),
  
  -- Admin notes when creating the match
  admin_notes TEXT,
  
  -- Tenant response
  tenant_responded_at TIMESTAMP WITH TIME ZONE,
  tenant_notes TEXT,
  
  -- Landlord response
  landlord_responded_at TIMESTAMP WITH TIME ZONE,
  landlord_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Create index for fast lookups
CREATE INDEX idx_match_proposals_tenant ON public.match_proposals(tenant_id, status);
CREATE INDEX idx_match_proposals_unit ON public.match_proposals(unit_id, status);
CREATE INDEX idx_match_proposals_status ON public.match_proposals(status);

-- Enable RLS
ALTER TABLE public.match_proposals ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (using is_admin RPC)
CREATE POLICY "Admins can manage all match proposals"
ON public.match_proposals
FOR ALL
USING (public.is_admin(auth.uid()));

-- Tenants can view their own proposals
CREATE POLICY "Tenants can view their own match proposals"
ON public.match_proposals
FOR SELECT
USING (tenant_id = auth.uid());

-- Tenants can update their own proposals (to respond)
CREATE POLICY "Tenants can respond to their match proposals"
ON public.match_proposals
FOR UPDATE
USING (tenant_id = auth.uid() AND status = 'pending_tenant')
WITH CHECK (tenant_id = auth.uid());

-- Landlords can view proposals for their units
CREATE POLICY "Landlords can view proposals for their units"
ON public.match_proposals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.id = match_proposals.unit_id
    AND p.owner_id = auth.uid()
  )
);

-- Landlords can update proposals for their units (to approve/deny)
CREATE POLICY "Landlords can respond to proposals for their units"
ON public.match_proposals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.id = match_proposals.unit_id
    AND p.owner_id = auth.uid()
  )
  AND status = 'pending_landlord'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.id = match_proposals.unit_id
    AND p.owner_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_match_proposals_updated_at
  BEFORE UPDATE ON public.match_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();