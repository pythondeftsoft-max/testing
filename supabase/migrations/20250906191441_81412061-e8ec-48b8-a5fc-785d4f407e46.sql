-- Add missing property_payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.property_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  payout_bank_account_id UUID NULL,
  stripe_connect_account_id UUID NULL REFERENCES public.stripe_connect_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Add missing portfolio_payment_settings table if it doesn't exist  
CREATE TABLE IF NOT EXISTS public.portfolio_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  connect_account_id UUID NOT NULL REFERENCES public.stripe_connect_accounts(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(portfolio_id)
);

-- Enable RLS on both tables
ALTER TABLE public.property_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_payment_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_payment_settings
CREATE POLICY "Property owners can manage their payment settings" 
ON public.property_payment_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = property_payment_settings.property_id 
    AND properties.owner_id = auth.uid()
  )
);

-- Create RLS policies for portfolio_payment_settings
CREATE POLICY "Portfolio users can manage payment settings" 
ON public.portfolio_payment_settings 
FOR ALL 
USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_property_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_portfolio_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_property_payment_settings_updated_at ON public.property_payment_settings;
CREATE TRIGGER update_property_payment_settings_updated_at
  BEFORE UPDATE ON public.property_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_property_payment_settings_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_payment_settings_updated_at ON public.portfolio_payment_settings;
CREATE TRIGGER update_portfolio_payment_settings_updated_at
  BEFORE UPDATE ON public.portfolio_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_portfolio_payment_settings_updated_at();

-- Add unique constraint to stripe_connect_accounts to prevent duplicate accounts per user
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stripe_connect_accounts_user_stripe_unique'
    ) THEN
        -- Add unique constraint
        ALTER TABLE public.stripe_connect_accounts 
        ADD CONSTRAINT stripe_connect_accounts_user_stripe_unique 
        UNIQUE (user_id, stripe_account_id);
    END IF;
END $$;