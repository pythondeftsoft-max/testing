
-- Auto-tag rules for tenant rent payments
CREATE TABLE public.tenant_auto_tag_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_rental_id UUID REFERENCES public.tenant_rentals(id) ON DELETE CASCADE,
  match_description TEXT NOT NULL,
  match_merchant_name TEXT,
  amount_min NUMERIC NOT NULL,
  amount_max NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_auto_tag_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules" ON public.tenant_auto_tag_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own rules" ON public.tenant_auto_tag_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON public.tenant_auto_tag_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.tenant_auto_tag_rules FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tenant_auto_tag_rules_user ON public.tenant_auto_tag_rules(user_id);
CREATE INDEX idx_tenant_auto_tag_rules_active ON public.tenant_auto_tag_rules(user_id, is_active) WHERE is_active = true;
