-- Add missing columns to rent_splits table
ALTER TABLE public.rent_splits 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update existing rent split records to be active
UPDATE public.rent_splits SET is_active = true WHERE is_active IS NULL;

-- Update existing rent split to link to the correct tenant (assuming demo tenant)
UPDATE public.rent_splits 
SET tenant_id = (
  SELECT tenant_id 
  FROM property_applications 
  WHERE property_id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25' 
  AND status = 'approved' 
  LIMIT 1
)
WHERE property_id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Update get_active_rent_split function to work with new structure
CREATE OR REPLACE FUNCTION public.get_active_rent_split(
  p_property_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS rent_splits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result rent_splits;
BEGIN
  -- Get the most recent active rent split for the property
  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
      AND is_active = true
    ORDER BY effective_date DESC
    LIMIT 1;
  ELSE
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND is_active = true
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;

  RETURN result;
END;
$$;

-- Update calculate_current_balance function to use tenant portion from rent splits
CREATE OR REPLACE FUNCTION public.calculate_current_balance(p_property_id uuid, p_tenant_id uuid, p_current_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(total_due numeric, total_paid numeric, balance_remaining numeric, total_late_fees numeric, current_due_date date)
LANGUAGE plpgsql
AS $$
DECLARE
  v_property RECORD;
  v_current_month date;
  v_due_date date;
  v_rent_split RECORD;
  v_tenant_amount numeric;
BEGIN
  -- Get property details
  SELECT monthly_rent, late_fee_amount, late_fee_grace_days, rent_due_day
  INTO v_property
  FROM properties 
  WHERE id = p_property_id;
  
  -- Check for active rent split
  SELECT * INTO v_rent_split
  FROM get_active_rent_split(p_property_id, p_tenant_id);
  
  -- Use tenant portion if rent split exists, otherwise use full monthly rent
  IF v_rent_split.id IS NOT NULL THEN
    v_tenant_amount := v_rent_split.tenant_portion;
  ELSE
    v_tenant_amount := v_property.monthly_rent;
  END IF;
  
  -- Calculate current month's due date
  v_current_month := date_trunc('month', p_current_date);
  v_due_date := v_current_month + (v_property.rent_due_day - 1) * interval '1 day';
  
  -- If we're past this month's due date, move to next month
  IF p_current_date > v_due_date THEN
    v_due_date := v_due_date + interval '1 month';
  END IF;
  
  RETURN QUERY
  SELECT 
    v_tenant_amount as total_due,
    COALESCE(SUM(rp.amount), 0) as total_paid,
    GREATEST(0, v_tenant_amount - COALESCE(SUM(rp.amount), 0)) as balance_remaining,
    COALESCE(SUM(rp.late_fee_amount), 0) as total_late_fees,
    v_due_date as current_due_date
  FROM rent_payments rp
  WHERE rp.property_id = p_property_id 
    AND rp.tenant_id = p_tenant_id
    AND date_trunc('month', rp.payment_date) = date_trunc('month', p_current_date);
END;
$$;