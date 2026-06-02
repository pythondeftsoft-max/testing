-- Create portfolio financial accounts table for tracking cash, receivables, payables, equity
CREATE TABLE public.portfolio_financial_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  account_type TEXT NOT NULL, -- 'cash', 'receivables', 'payables', 'equity', 'assets', 'liabilities'
  account_name TEXT NOT NULL,
  account_code TEXT,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio transactions table for detailed cash flow tracking
CREATE TABLE public.portfolio_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  property_id UUID,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL, -- 'operating', 'investing', 'financing'
  category TEXT NOT NULL, -- 'rent_income', 'maintenance_expense', 'management_fee', etc.
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- Link to rent_payments, maintenance_requests, etc.
  reference_type TEXT, -- 'rent_payment', 'maintenance_request', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security deposits tracking table
CREATE TABLE public.portfolio_security_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  property_id UUID NOT NULL,
  tenant_id UUID,
  amount NUMERIC NOT NULL,
  deposit_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'held', -- 'held', 'returned', 'applied'
  return_date DATE,
  return_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_security_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolio_financial_accounts
CREATE POLICY "Portfolio members can view financial accounts" 
ON public.portfolio_financial_accounts 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio admin_partners can manage financial accounts" 
ON public.portfolio_financial_accounts 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

-- Create RLS policies for portfolio_transactions
CREATE POLICY "Portfolio members can view transactions" 
ON public.portfolio_transactions 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio admin_partners can manage transactions" 
ON public.portfolio_transactions 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

-- Create RLS policies for portfolio_security_deposits
CREATE POLICY "Portfolio members can view security deposits" 
ON public.portfolio_security_deposits 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio admin_partners can manage security deposits" 
ON public.portfolio_security_deposits 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

-- Create indexes for better performance
CREATE INDEX idx_portfolio_financial_accounts_portfolio_id ON public.portfolio_financial_accounts(portfolio_id);
CREATE INDEX idx_portfolio_transactions_portfolio_id ON public.portfolio_transactions(portfolio_id);
CREATE INDEX idx_portfolio_transactions_date ON public.portfolio_transactions(transaction_date);
CREATE INDEX idx_portfolio_security_deposits_portfolio_id ON public.portfolio_security_deposits(portfolio_id);

-- Create function to get portfolio balance sheet data
CREATE OR REPLACE FUNCTION public.get_portfolio_balance_sheet(p_portfolio_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_cash NUMERIC,
  total_receivables NUMERIC,
  total_assets NUMERIC,
  total_payables NUMERIC,
  total_liabilities NUMERIC,
  total_equity NUMERIC,
  security_deposits_held NUMERIC,
  property_count INTEGER,
  occupied_units INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cash_accounts AS (
    SELECT COALESCE(SUM(current_balance), 0) as cash_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'cash'
  ),
  receivables AS (
    SELECT COALESCE(SUM(current_balance), 0) as receivables_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'receivables'
  ),
  assets AS (
    SELECT COALESCE(SUM(current_balance), 0) as assets_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'assets'
  ),
  payables AS (
    SELECT COALESCE(SUM(current_balance), 0) as payables_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'payables'
  ),
  liabilities AS (
    SELECT COALESCE(SUM(current_balance), 0) as liabilities_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'liabilities'
  ),
  equity AS (
    SELECT COALESCE(SUM(current_balance), 0) as equity_balance
    FROM portfolio_financial_accounts 
    WHERE portfolio_id = p_portfolio_id AND account_type = 'equity'
  ),
  deposits AS (
    SELECT COALESCE(SUM(amount), 0) as deposits_total
    FROM portfolio_security_deposits 
    WHERE portfolio_id = p_portfolio_id AND status = 'held'
  ),
  property_stats AS (
    SELECT 
      COUNT(*) as prop_count,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_count
    FROM properties 
    WHERE portfolio_id = p_portfolio_id AND deleted_at IS NULL
  )
  SELECT 
    c.cash_balance,
    r.receivables_balance,
    (c.cash_balance + r.receivables_balance + a.assets_balance) as total_assets,
    p.payables_balance,
    (p.payables_balance + l.liabilities_balance) as total_liabilities,
    e.equity_balance,
    d.deposits_total,
    ps.prop_count::INTEGER,
    ps.occupied_count::INTEGER
  FROM cash_accounts c
  CROSS JOIN receivables r
  CROSS JOIN assets a
  CROSS JOIN payables p
  CROSS JOIN liabilities l
  CROSS JOIN equity e
  CROSS JOIN deposits d
  CROSS JOIN property_stats ps;
END;
$$;

-- Create function to get portfolio cash flow data
CREATE OR REPLACE FUNCTION public.get_portfolio_cash_flow(p_portfolio_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE(
  operating_income NUMERIC,
  operating_expenses NUMERIC,
  net_operating_cash NUMERIC,
  investing_cash_flow NUMERIC,
  financing_cash_flow NUMERIC,
  net_cash_flow NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH operating_flows AS (
    SELECT 
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expenses
    FROM portfolio_transactions 
    WHERE portfolio_id = p_portfolio_id 
      AND transaction_date BETWEEN p_start_date AND p_end_date
      AND transaction_type = 'operating'
  ),
  investing_flows AS (
    SELECT COALESCE(SUM(amount), 0) as investing_total
    FROM portfolio_transactions 
    WHERE portfolio_id = p_portfolio_id 
      AND transaction_date BETWEEN p_start_date AND p_end_date
      AND transaction_type = 'investing'
  ),
  financing_flows AS (
    SELECT COALESCE(SUM(amount), 0) as financing_total
    FROM portfolio_transactions 
    WHERE portfolio_id = p_portfolio_id 
      AND transaction_date BETWEEN p_start_date AND p_end_date
      AND transaction_type = 'financing'
  )
  SELECT 
    o.income,
    o.expenses,
    (o.income - o.expenses) as net_operating,
    i.investing_total,
    f.financing_total,
    ((o.income - o.expenses) + i.investing_total + f.financing_total) as net_total
  FROM operating_flows o
  CROSS JOIN investing_flows i
  CROSS JOIN financing_flows f;
END;
$$;

-- Create function to get portfolio rent roll data
CREATE OR REPLACE FUNCTION public.get_portfolio_rent_roll(p_portfolio_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  property_id UUID,
  property_address TEXT,
  unit_number TEXT,
  tenant_name TEXT,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent NUMERIC,
  security_deposit NUMERIC,
  rent_status TEXT,
  days_vacant INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    COALESCE(pu.unit_number, 'Main Unit') as unit_num,
    COALESCE(pr.first_name || ' ' || pr.last_name, 'Vacant') as tenant,
    p.lease_start_date,
    p.lease_end_date,
    p.monthly_rent,
    COALESCE(sd.amount, 0) as deposit,
    p.status as rent_stat,
    CASE 
      WHEN p.status = 'available' THEN (p_as_of_date - COALESCE(p.lease_end_date, p.created_at::DATE))
      ELSE 0 
    END as vacant_days
  FROM properties p
  LEFT JOIN property_units pu ON p.id = pu.property_id
  LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
  LEFT JOIN profiles pr ON pa.tenant_id = pr.id
  LEFT JOIN portfolio_security_deposits sd ON p.id = sd.property_id AND sd.status = 'held'
  WHERE p.portfolio_id = p_portfolio_id 
    AND p.deleted_at IS NULL
  ORDER BY p.address, pu.unit_number;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_portfolio_financial_accounts_updated_at
BEFORE UPDATE ON public.portfolio_financial_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_transactions_updated_at
BEFORE UPDATE ON public.portfolio_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_security_deposits_updated_at
BEFORE UPDATE ON public.portfolio_security_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();