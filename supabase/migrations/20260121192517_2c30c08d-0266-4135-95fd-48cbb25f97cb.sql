-- =====================================================
-- SECURITY HARDENING MIGRATION - Part 2
-- Fix remaining functions (drop and recreate where needed)
-- =====================================================

-- Drop and recreate generate_invitation_token with correct signature
DROP FUNCTION IF EXISTS public.generate_invitation_token() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invitation_token IS NULL THEN
    NEW.invitation_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger if it was dropped
DROP TRIGGER IF EXISTS set_invitation_token ON account_invitations;
CREATE TRIGGER set_invitation_token
  BEFORE INSERT ON account_invitations
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_token();

-- Fix cleanup_expired_invitations function
DROP FUNCTION IF EXISTS public.cleanup_expired_invitations();
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE account_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

-- Fix get_tenant_rent_balance function
DROP FUNCTION IF EXISTS public.get_tenant_rent_balance(uuid);
CREATE OR REPLACE FUNCTION public.get_tenant_rent_balance(p_tenant_id uuid)
RETURNS TABLE(total_due numeric, total_paid numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN rp.status IN ('pending', 'overdue') THEN rp.amount ELSE 0 END), 0) as total_due,
    COALESCE(SUM(CASE WHEN rp.status = 'paid' THEN rp.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN rp.status IN ('pending', 'overdue') THEN rp.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN rp.status = 'paid' THEN rp.amount ELSE 0 END), 0) as balance
  FROM rent_payments rp
  WHERE rp.tenant_id = p_tenant_id;
END;
$$;

-- Fix calculate_late_fee function
DROP FUNCTION IF EXISTS public.calculate_late_fee(uuid);
CREATE OR REPLACE FUNCTION public.calculate_late_fee(p_payment_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_late_fee numeric := 0;
  v_days_late integer;
  v_grace_days integer;
  v_late_fee_amount numeric;
  v_amount numeric;
BEGIN
  SELECT 
    GREATEST(0, CURRENT_DATE - rp.due_date),
    COALESCE(p.late_fee_grace_days, 5),
    COALESCE(p.late_fee_amount, 50),
    rp.amount
  INTO v_days_late, v_grace_days, v_late_fee_amount, v_amount
  FROM rent_payments rp
  JOIN properties p ON rp.property_id = p.id
  WHERE rp.id = p_payment_id;
  
  IF v_days_late > v_grace_days THEN
    v_late_fee := v_late_fee_amount;
  END IF;
  
  RETURN v_late_fee;
END;
$$;

-- Fix get_property_financial_summary function
DROP FUNCTION IF EXISTS public.get_property_financial_summary(uuid);
CREATE OR REPLACE FUNCTION public.get_property_financial_summary(p_property_id uuid)
RETURNS TABLE(
  total_rent_collected numeric,
  total_rent_outstanding numeric,
  total_maintenance_costs numeric,
  net_income numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT SUM(amount) FROM rent_payments WHERE property_id = p_property_id AND status = 'paid'), 0) as total_rent_collected,
    COALESCE((SELECT SUM(amount) FROM rent_payments WHERE property_id = p_property_id AND status IN ('pending', 'overdue')), 0) as total_rent_outstanding,
    COALESCE((SELECT SUM(actual_cost) FROM maintenance_requests WHERE property_id = p_property_id AND status = 'completed'), 0) as total_maintenance_costs,
    COALESCE((SELECT SUM(amount) FROM rent_payments WHERE property_id = p_property_id AND status = 'paid'), 0) -
    COALESCE((SELECT SUM(actual_cost) FROM maintenance_requests WHERE property_id = p_property_id AND status = 'completed'), 0) as net_income;
END;
$$;