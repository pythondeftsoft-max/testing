-- Create tax_iris_batches table
CREATE TABLE public.tax_iris_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  submitted_at TIMESTAMP WITH TIME ZONE,
  accepted_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  batch_name TEXT,
  notes TEXT
);

-- Create tax_iris_batch_items table
CREATE TABLE public.tax_iris_batch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  portfolio_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  recipient_id UUID,
  form_total NUMERIC NOT NULL DEFAULT 0,
  related_form_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  form_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.tax_iris_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_iris_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for tax_iris_batches
CREATE POLICY "Portfolio managers can manage iris batches" 
ON public.tax_iris_batches 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

CREATE POLICY "Portfolio members can view iris batches" 
ON public.tax_iris_batches 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

-- RLS policies for tax_iris_batch_items
CREATE POLICY "Portfolio editors can manage batch items" 
ON public.tax_iris_batch_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM tax_iris_batches b 
  WHERE b.id = tax_iris_batch_items.batch_id 
  AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM tax_iris_batches b 
  WHERE b.id = tax_iris_batch_items.batch_id 
  AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
));

CREATE POLICY "Portfolio members can view batch items" 
ON public.tax_iris_batch_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tax_iris_batches b 
  WHERE b.id = tax_iris_batch_items.batch_id 
  AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
));

-- Create compute_1099_candidates RPC function
CREATE OR REPLACE FUNCTION public.compute_1099_candidates(p_portfolio UUID, p_year INTEGER)
RETURNS TABLE(
  recipient_id UUID,
  form_type TEXT,
  total NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH transaction_totals AS (
    SELECT 
      tt.payee_id as recipient_id,
      CASE 
        WHEN SUM(tt.amount) >= 600 THEN '1099_nec'::TEXT
        ELSE '1099_misc'::TEXT
      END as form_type,
      SUM(tt.amount) as total
    FROM tax_transactions tt
    WHERE tt.portfolio_id = p_portfolio
    AND tt.tax_year = p_year
    AND tt.payee_id IS NOT NULL
    GROUP BY tt.payee_id
    HAVING SUM(tt.amount) >= 600
  )
  SELECT t.recipient_id, t.form_type, t.total
  FROM transaction_totals t;
END;
$$;