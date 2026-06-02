-- Create asset_invitations table
CREATE TABLE public.asset_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT NOT NULL,
  invitation_token TEXT NOT NULL DEFAULT generate_invitation_token(),
  role_type TEXT NOT NULL DEFAULT 'tenant',
  
  -- Financial terms
  monthly_amount NUMERIC,
  currency_code TEXT DEFAULT 'USD',
  start_date DATE,
  end_date DATE,
  
  -- Invitation lifecycle
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  
  -- Metadata
  invitation_data JSONB DEFAULT '{}',
  notes TEXT
);

-- Create leases table
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  
  -- Lease terms
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  security_deposit NUMERIC,
  
  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  terminated_at TIMESTAMP WITH TIME ZONE,
  terminated_by UUID,
  
  -- Metadata
  lease_terms JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Unique constraint to prevent multiple active leases per asset
  CONSTRAINT unique_active_lease_per_asset UNIQUE (asset_id, tenant_id) DEFERRABLE INITIALLY DEFERRED
);

-- Create recurring_charges table
CREATE TABLE public.recurring_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL,
  charge_type TEXT NOT NULL DEFAULT 'rent',
  amount NUMERIC NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  
  -- Recurrence pattern
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, weekly, yearly
  due_day INTEGER DEFAULT 1, -- day of month (1-31) or week (1-7)
  
  -- Status and lifecycle
  is_active BOOLEAN DEFAULT true,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Metadata
  charge_metadata JSONB DEFAULT '{}',
  description TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.asset_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_charges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_invitations
CREATE POLICY "Asset owners can manage invitations for their assets"
ON public.asset_invitations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    JOIN public.portfolios p ON pa.portfolio_id = p.id
    WHERE pa.id = asset_invitations.asset_id
    AND (
      p.user_id = auth.uid() OR
      has_portfolio_role(p.id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  )
);

CREATE POLICY "Invitees can view and accept their invitations"
ON public.asset_invitations FOR SELECT
USING (invitee_email = get_user_email(auth.uid()));

CREATE POLICY "Invitees can update their invitation status"
ON public.asset_invitations FOR UPDATE
USING (invitee_email = get_user_email(auth.uid()))
WITH CHECK (invitee_email = get_user_email(auth.uid()));

-- RLS Policies for leases
CREATE POLICY "Asset owners can manage leases"
ON public.leases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    JOIN public.portfolios p ON pa.portfolio_id = p.id
    WHERE pa.id = leases.asset_id
    AND (
      p.user_id = auth.uid() OR
      has_portfolio_role(p.id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  )
);

CREATE POLICY "Tenants can view their own leases"
ON public.leases FOR SELECT
USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can update certain lease fields"
ON public.leases FOR UPDATE
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

-- RLS Policies for recurring_charges
CREATE POLICY "Asset owners can manage recurring charges"
ON public.recurring_charges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.portfolio_assets pa ON l.asset_id = pa.id
    JOIN public.portfolios p ON pa.portfolio_id = p.id
    WHERE l.id = recurring_charges.lease_id
    AND (
      p.user_id = auth.uid() OR
      has_portfolio_role(p.id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  )
);

CREATE POLICY "Tenants can view their recurring charges"
ON public.recurring_charges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = recurring_charges.lease_id
    AND l.tenant_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_asset_invitations_asset_id ON public.asset_invitations(asset_id);
CREATE INDEX idx_asset_invitations_invitee_email ON public.asset_invitations(invitee_email);
CREATE INDEX idx_asset_invitations_token ON public.asset_invitations(invitation_token);
CREATE INDEX idx_asset_invitations_status ON public.asset_invitations(status);

CREATE INDEX idx_leases_asset_id ON public.leases(asset_id);
CREATE INDEX idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX idx_leases_status ON public.leases(status);

CREATE INDEX idx_recurring_charges_lease_id ON public.recurring_charges(lease_id);
CREATE INDEX idx_recurring_charges_active ON public.recurring_charges(is_active) WHERE is_active = true;

-- Create triggers for updated_at
CREATE TRIGGER update_asset_invitations_updated_at
  BEFORE UPDATE ON public.asset_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_recurring_charges_updated_at
  BEFORE UPDATE ON public.recurring_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to accept asset invitation
CREATE OR REPLACE FUNCTION public.accept_asset_invitation(
  p_invitation_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, lease_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  new_lease_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record 
  FROM public.asset_invitations 
  WHERE invitation_token = p_invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update invitation as accepted
  UPDATE public.asset_invitations 
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id,
      updated_at = NOW()
  WHERE invitation_token = p_invitation_token;
  
  -- Create lease
  INSERT INTO public.leases (
    asset_id,
    tenant_id,
    landlord_id,
    start_date,
    end_date,
    monthly_rent,
    currency_code,
    lease_terms
  ) VALUES (
    invitation_record.asset_id,
    p_user_id,
    invitation_record.inviter_id,
    COALESCE(invitation_record.start_date, CURRENT_DATE),
    invitation_record.end_date,
    invitation_record.monthly_amount,
    invitation_record.currency_code,
    invitation_record.invitation_data
  ) RETURNING id INTO new_lease_id;
  
  -- Create recurring rent charge if monthly amount specified
  IF invitation_record.monthly_amount IS NOT NULL THEN
    INSERT INTO public.recurring_charges (
      lease_id,
      charge_type,
      amount,
      currency_code,
      frequency,
      due_day,
      starts_on,
      description
    ) VALUES (
      new_lease_id,
      'rent',
      invitation_record.monthly_amount,
      invitation_record.currency_code,
      'monthly',
      1, -- Due on 1st of each month
      COALESCE(invitation_record.start_date, CURRENT_DATE),
      'Monthly rent payment'
    );
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully'::TEXT, new_lease_id;
END;
$$;