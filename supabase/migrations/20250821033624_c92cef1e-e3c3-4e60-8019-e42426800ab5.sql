-- Create portfolio_asset_invitations table
CREATE TABLE IF NOT EXISTS public.portfolio_asset_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID NULL,
  invitee_type TEXT NOT NULL CHECK (invitee_type IN ('tenant', 'landlord', 'property_manager', 'investor', 'viewer', 'vendor')),
  role TEXT NOT NULL CHECK (role IN ('manager', 'editor', 'viewer', 'billing_only')),
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NULL,
  declined_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create asset_recurring_charges table
CREATE TABLE IF NOT EXISTS public.asset_recurring_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  invite_id UUID NULL,
  charge_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'annually', 'one-time')),
  due_day INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.portfolio_asset_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_recurring_charges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolio_asset_invitations
CREATE POLICY "Portfolio members can manage asset invitations" ON public.portfolio_asset_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  );

CREATE POLICY "Invited users can view their invitations" ON public.portfolio_asset_invitations
  FOR SELECT USING (
    invited_user_id = auth.uid() OR 
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Invited users can update their invitation status" ON public.portfolio_asset_invitations
  FOR UPDATE USING (
    invited_user_id = auth.uid() OR 
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create RLS policies for asset_recurring_charges
CREATE POLICY "Portfolio members can manage asset charges" ON public.asset_recurring_charges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  );

CREATE POLICY "Portfolio viewers can view asset charges" ON public.asset_recurring_charges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_portfolio_asset_invitations_updated_at
  BEFORE UPDATE ON public.portfolio_asset_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_asset_recurring_charges_updated_at
  BEFORE UPDATE ON public.asset_recurring_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();