
-- Add columns to rent_payments table to track due dates and late fees
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS days_late integer DEFAULT 0;

-- Add landlord late fee policy settings to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 25.00;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS late_fee_grace_days integer DEFAULT 5;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_due_day integer DEFAULT 1;

-- Create a view to calculate payment statuses and outstanding balances
CREATE OR REPLACE VIEW rent_payment_details AS
SELECT 
  rp.*,
  p.monthly_rent,
  p.late_fee_amount as property_late_fee,
  p.late_fee_grace_days,
  p.rent_due_day,
  CASE 
    WHEN rp.payment_date <= rp.due_date THEN 'on_time'
    WHEN rp.payment_date > rp.due_date THEN 'late'
    ELSE 'on_time'
  END as payment_status,
  CASE 
    WHEN rp.payment_date > rp.due_date THEN 
      GREATEST(0, rp.payment_date - rp.due_date - p.late_fee_grace_days)
    ELSE 0
  END as calculated_days_late
FROM rent_payments rp
JOIN properties p ON rp.property_id = p.id;

-- Function to calculate current balance for a tenant/property
CREATE OR REPLACE FUNCTION calculate_current_balance(
  p_property_id uuid,
  p_tenant_id uuid,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_due numeric,
  total_paid numeric,
  balance_remaining numeric,
  total_late_fees numeric,
  current_due_date date
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_property RECORD;
  v_current_month date;
  v_due_date date;
BEGIN
  -- Get property details
  SELECT monthly_rent, late_fee_amount, late_fee_grace_days, rent_due_day
  INTO v_property
  FROM properties 
  WHERE id = p_property_id;
  
  -- Calculate current month's due date
  v_current_month := date_trunc('month', p_current_date);
  v_due_date := v_current_month + (v_property.rent_due_day - 1) * interval '1 day';
  
  -- If we're past this month's due date, move to next month
  IF p_current_date > v_due_date THEN
    v_due_date := v_due_date + interval '1 month';
  END IF;
  
  RETURN QUERY
  SELECT 
    v_property.monthly_rent as total_due,
    COALESCE(SUM(rp.amount), 0) as total_paid,
    GREATEST(0, v_property.monthly_rent - COALESCE(SUM(rp.amount), 0)) as balance_remaining,
    COALESCE(SUM(rp.late_fee_amount), 0) as total_late_fees,
    v_due_date as current_due_date
  FROM rent_payments rp
  WHERE rp.property_id = p_property_id 
    AND rp.tenant_id = p_tenant_id
    AND date_trunc('month', rp.payment_date) = date_trunc('month', p_current_date);
END;
$$;
