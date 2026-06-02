-- Create portfolio payment settings table
CREATE TABLE public.portfolio_payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  connect_account_id TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.portfolio_payment_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage portfolio payment settings for portfolios they own/manage"
ON public.portfolio_payment_settings
FOR ALL
USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  OR is_portfolio_owner(portfolio_id, auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_portfolio_payment_settings_updated_at
BEFORE UPDATE ON public.portfolio_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for performance
CREATE INDEX idx_portfolio_payment_settings_portfolio_id ON public.portfolio_payment_settings(portfolio_id);
CREATE INDEX idx_portfolio_payment_settings_default ON public.portfolio_payment_settings(portfolio_id, is_default);