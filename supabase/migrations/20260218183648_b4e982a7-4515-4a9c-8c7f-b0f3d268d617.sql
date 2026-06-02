
CREATE TABLE public.tenant_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  address_text TEXT NOT NULL,
  landlord_name TEXT,
  monthly_rent NUMERIC NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  start_month INTEGER,
  start_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rentals"
  ON public.tenant_rentals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rentals"
  ON public.tenant_rentals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rentals"
  ON public.tenant_rentals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rentals"
  ON public.tenant_rentals FOR DELETE
  USING (auth.uid() = user_id);
