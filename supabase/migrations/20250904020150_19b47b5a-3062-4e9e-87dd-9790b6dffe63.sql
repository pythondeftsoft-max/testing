-- Create deposits table
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  deposit_date DATE NOT NULL,
  payer_name TEXT,
  reference_number TEXT,
  notes TEXT,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'reconciled')),
  total_allocated NUMERIC DEFAULT 0 CHECK (total_allocated >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create deposit allocations table
CREATE TABLE public.deposit_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  landlord_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  allocation_type TEXT NOT NULL DEFAULT 'rent' CHECK (allocation_type IN ('rent', 'voucher', 'tenant_portion', 'fees', 'other')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(deposit_id, property_id, allocation_type)
);

-- Create payouts table
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID,
  landlord_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  payout_method TEXT NOT NULL DEFAULT 'ach' CHECK (payout_method IN ('ach', 'check', 'wire')),
  recipient_details JSONB DEFAULT '{}',
  checkbook_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  failure_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create payout allocations table (links payouts to specific deposit allocations)
CREATE TABLE public.payout_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  deposit_allocation_id UUID NOT NULL REFERENCES public.deposit_allocations(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create payment activity log table
CREATE TABLE public.payment_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('deposit', 'allocation', 'payout')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'allocated', 'sent', 'reconciled')),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "Users can manage their own deposits" ON public.deposits
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Portfolio members can view deposits" ON public.deposits
FOR SELECT USING (
  portfolio_id IS NOT NULL AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
);

-- RLS Policies for deposit allocations
CREATE POLICY "Users can manage allocations for their deposits" ON public.deposit_allocations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.deposits d 
    WHERE d.id = deposit_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can view allocations for their properties" ON public.deposit_allocations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.properties p 
    WHERE p.id = property_id AND p.owner_id = auth.uid()
  )
);

-- RLS Policies for payouts
CREATE POLICY "Users can manage their own payouts" ON public.payouts
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Landlords can view their payouts" ON public.payouts
FOR SELECT USING (landlord_id = auth.uid());

-- RLS Policies for payout allocations
CREATE POLICY "Users can manage payout allocations for their payouts" ON public.payout_allocations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.payouts p 
    WHERE p.id = payout_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for activity log
CREATE POLICY "Users can view their own activity" ON public.payment_activity_log
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs" ON public.payment_activity_log
FOR INSERT WITH CHECK (true);

-- Add updated_at triggers
CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_deposit_allocations_updated_at
  BEFORE UPDATE ON public.deposit_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to validate allocation amounts don't exceed deposit total
CREATE OR REPLACE FUNCTION public.validate_deposit_allocation()
RETURNS TRIGGER AS $$
DECLARE
  deposit_amount NUMERIC;
  total_allocated NUMERIC;
BEGIN
  -- Get the deposit amount
  SELECT amount INTO deposit_amount
  FROM public.deposits
  WHERE id = NEW.deposit_id;
  
  -- Calculate total allocated (including this new/updated allocation)
  SELECT COALESCE(SUM(amount), 0) INTO total_allocated
  FROM public.deposit_allocations
  WHERE deposit_id = NEW.deposit_id
  AND (TG_OP = 'INSERT' OR id != NEW.id);
  
  -- Add the current allocation amount
  total_allocated := total_allocated + NEW.amount;
  
  -- Check if over-allocated
  IF total_allocated > deposit_amount THEN
    RAISE EXCEPTION 'Total allocations (%) cannot exceed deposit amount (%)', total_allocated, deposit_amount;
  END IF;
  
  -- Update the deposits table with new total_allocated
  UPDATE public.deposits
  SET total_allocated = total_allocated
  WHERE id = NEW.deposit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add validation trigger
CREATE TRIGGER validate_allocation_amount
  BEFORE INSERT OR UPDATE ON public.deposit_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deposit_allocation();

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_payment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, new_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      NEW.id,
      'created',
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, old_values, new_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      NEW.id,
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, old_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      OLD.id,
      'deleted',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add activity logging triggers
CREATE TRIGGER log_deposits_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_activity();

CREATE TRIGGER log_allocations_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.deposit_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_activity();

CREATE TRIGGER log_payouts_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_activity();