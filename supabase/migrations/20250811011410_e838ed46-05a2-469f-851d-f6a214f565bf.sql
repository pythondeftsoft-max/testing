-- Create tables for IRS e-file batch processing per portfolio
-- Batches table
CREATE TABLE IF NOT EXISTS public.tax_iris_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validating','ready','submitting','submitted','accepted','rejected','failed')),
  submission_id TEXT,
  transmission_id TEXT,
  total_forms INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Items table
CREATE TABLE IF NOT EXISTS public.tax_iris_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.tax_iris_batches(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  recipient_id UUID,
  form_type TEXT NOT NULL,
  form_total NUMERIC NOT NULL DEFAULT 0,
  related_form_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','queued','submitted','accepted','rejected','error')),
  error_code TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_iris_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_iris_batch_items ENABLE ROW LEVEL SECURITY;

-- Policies for batches
DROP POLICY IF EXISTS "Portfolio members can view batches" ON public.tax_iris_batches;
CREATE POLICY "Portfolio members can view batches"
ON public.tax_iris_batches
FOR SELECT
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

DROP POLICY IF EXISTS "Portfolio editors can manage batches" ON public.tax_iris_batches;
CREATE POLICY "Portfolio editors can manage batches"
ON public.tax_iris_batches
FOR ALL
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
WITH CHECK (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

-- Policies for batch items (based on parent batch ownership)
DROP POLICY IF EXISTS "Portfolio members can view batch items" ON public.tax_iris_batch_items;
CREATE POLICY "Portfolio members can view batch items"
ON public.tax_iris_batch_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tax_iris_batches b
    WHERE b.id = batch_id
      AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

DROP POLICY IF EXISTS "Portfolio editors can manage batch items" ON public.tax_iris_batch_items;
CREATE POLICY "Portfolio editors can manage batch items"
ON public.tax_iris_batch_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tax_iris_batches b
    WHERE b.id = batch_id
      AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tax_iris_batches b
    WHERE b.id = batch_id
      AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- Triggers to maintain updated_at
DROP TRIGGER IF EXISTS update_tax_iris_batches_updated_at ON public.tax_iris_batches;
CREATE TRIGGER update_tax_iris_batches_updated_at
BEFORE UPDATE ON public.tax_iris_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tax_iris_batch_items_updated_at ON public.tax_iris_batch_items;
CREATE TRIGGER update_tax_iris_batch_items_updated_at
BEFORE UPDATE ON public.tax_iris_batch_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tax_iris_batches_portfolio_year ON public.tax_iris_batches (portfolio_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_iris_batches_status ON public.tax_iris_batches (status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_open_batch_per_portfolio_year
ON public.tax_iris_batches (portfolio_id, tax_year)
WHERE status IN ('draft','validating','ready','submitting');

CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON public.tax_iris_batch_items (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_portfolio_year ON public.tax_iris_batch_items (portfolio_id, tax_year);
