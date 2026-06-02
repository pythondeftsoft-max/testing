-- Create asset reminder preferences table
CREATE TABLE public.asset_reminder_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  user_id UUID NOT NULL,
  portfolio_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'annual',
  last_financial_update DATE,
  next_reminder_date DATE,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('quarterly', 'semi-annual', 'annual')),
  CONSTRAINT unique_asset_reminder UNIQUE (asset_id, user_id)
);

-- Enable RLS
ALTER TABLE public.asset_reminder_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own asset reminder preferences"
ON public.asset_reminder_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Portfolio members can manage reminder preferences"
ON public.asset_reminder_preferences
FOR ALL
USING (
  portfolio_id IS NOT NULL AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
)
WITH CHECK (
  portfolio_id IS NOT NULL AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- Create function to update next_reminder_date
CREATE OR REPLACE FUNCTION public.update_asset_reminder_next_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update next_reminder_date if reminders are enabled and last_financial_update is set
  IF NEW.is_enabled = true AND NEW.last_financial_update IS NOT NULL THEN
    NEW.next_reminder_date := compute_next_reminder_date(
      NEW.last_financial_update::timestamp with time zone, 
      NEW.frequency
    );
  ELSE
    NEW.next_reminder_date := NULL;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update next_reminder_date
CREATE TRIGGER update_asset_reminder_next_date_trigger
  BEFORE INSERT OR UPDATE ON public.asset_reminder_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_asset_reminder_next_date();

-- Create function to get overdue reminder preferences
CREATE OR REPLACE FUNCTION public.get_overdue_asset_reminders()
RETURNS TABLE(
  id UUID,
  asset_id UUID,
  user_id UUID,
  portfolio_id UUID,
  asset_name TEXT,
  user_email TEXT,
  frequency TEXT,
  days_overdue INTEGER,
  last_financial_update DATE,
  next_reminder_date DATE
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    arp.id,
    arp.asset_id,
    arp.user_id,
    arp.portfolio_id,
    COALESCE(pa.asset_name, p.address) as asset_name,
    au.email as user_email,
    arp.frequency,
    (CURRENT_DATE - arp.next_reminder_date)::INTEGER as days_overdue,
    arp.last_financial_update,
    arp.next_reminder_date
  FROM public.asset_reminder_preferences arp
  LEFT JOIN public.portfolio_assets pa ON arp.asset_id = pa.id
  LEFT JOIN public.properties p ON arp.asset_id = p.id
  JOIN auth.users au ON arp.user_id = au.id
  WHERE arp.is_enabled = true
    AND arp.next_reminder_date IS NOT NULL
    AND arp.next_reminder_date <= CURRENT_DATE;
END;
$$;