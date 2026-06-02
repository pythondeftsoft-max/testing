-- Fix accounts receivable system with proper balance calculations

-- Create rent_payments table for tracking all rent payments
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'partial', 'late')),
  late_fee_amount NUMERIC DEFAULT 0,
  days_late INTEGER DEFAULT 0,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create accounts_receivable_details table for detailed AR tracking
CREATE TABLE IF NOT EXISTS public.accounts_receivable_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES auth.users(id),
  balance_type TEXT NOT NULL DEFAULT 'rent' CHECK (balance_type IN ('rent', 'late_fees', 'utilities', 'deposits', 'other')),
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to calculate outstanding balance for a property
CREATE OR REPLACE FUNCTION calculate_property_outstanding_balance(p_property_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_monthly_rent NUMERIC := 0;
  v_lease_start_date DATE;
  v_total_due NUMERIC := 0;
  v_total_paid NUMERIC := 0;
  v_outstanding NUMERIC := 0;
  v_months_due INTEGER := 0;
  v_property_record RECORD;
BEGIN
  -- Get property details
  SELECT monthly_rent, lease_start_date, status
  INTO v_monthly_rent, v_lease_start_date, v_property_record
  FROM properties 
  WHERE id = p_property_id;
  
  -- If no property found or no monthly rent, return 0
  IF v_monthly_rent IS NULL OR v_monthly_rent = 0 THEN
    RETURN 0;
  END IF;
  
  -- If lease hasn't started yet, return 0
  IF v_lease_start_date IS NULL OR v_lease_start_date > p_as_of_date THEN
    RETURN 0;
  END IF;
  
  -- Calculate months due from lease start to as_of_date
  v_months_due := EXTRACT(YEAR FROM age(p_as_of_date, v_lease_start_date)) * 12 + 
                  EXTRACT(MONTH FROM age(p_as_of_date, v_lease_start_date)) + 1;
  
  -- Calculate total rent due
  v_total_due := v_monthly_rent * v_months_due;
  
  -- Add any additional charges from accounts_receivable_details
  SELECT COALESCE(SUM(amount), 0) INTO v_total_due
  FROM (
    SELECT v_total_due as amount
    UNION ALL
    SELECT SUM(amount)
    FROM accounts_receivable_details 
    WHERE property_id = p_property_id 
    AND due_date <= p_as_of_date
  ) combined;
  
  -- Calculate total payments made
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM rent_payments 
  WHERE property_id = p_property_id 
  AND payment_date IS NOT NULL
  AND payment_date <= p_as_of_date;
  
  -- Calculate outstanding balance
  v_outstanding := GREATEST(0, v_total_due - v_total_paid);
  
  RETURN v_outstanding;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update property outstanding balances
CREATE OR REPLACE FUNCTION update_property_outstanding_balances()
RETURNS VOID AS $$
BEGIN
  UPDATE properties 
  SET outstanding_balance = calculate_property_outstanding_balance(id),
      updated_at = now()
  WHERE status IN ('occupied', 'available') 
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update outstanding balance when rent payments change
CREATE OR REPLACE FUNCTION trigger_update_outstanding_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the property's outstanding balance
  UPDATE properties 
  SET outstanding_balance = calculate_property_outstanding_balance(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.property_id
      ELSE NEW.property_id
    END
  ),
  updated_at = now()
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.property_id
    ELSE NEW.property_id
  END;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic balance updates
DROP TRIGGER IF EXISTS trigger_rent_payments_update_balance ON rent_payments;
CREATE TRIGGER trigger_rent_payments_update_balance
  AFTER INSERT OR UPDATE OR DELETE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_outstanding_balance();

DROP TRIGGER IF EXISTS trigger_ar_details_update_balance ON accounts_receivable_details;
CREATE TRIGGER trigger_ar_details_update_balance
  AFTER INSERT OR UPDATE OR DELETE ON accounts_receivable_details
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_outstanding_balance();

-- Enable RLS on new tables
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rent_payments
CREATE POLICY "Property owners can manage rent payments"
  ON public.rent_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = rent_payments.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their rent payments"
  ON public.rent_payments FOR SELECT
  USING (tenant_id = auth.uid());

-- RLS Policies for accounts_receivable_details  
CREATE POLICY "Property owners can manage AR details"
  ON public.accounts_receivable_details FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = accounts_receivable_details.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their AR details"
  ON public.accounts_receivable_details FOR SELECT
  USING (tenant_id = auth.uid());

-- Insert some sample data to test the system
DO $$
DECLARE
    prop_record RECORD;
    tenant_record RECORD;
    months_back INTEGER;
    due_date_calc DATE;
BEGIN
    -- For each occupied property, create some rent payment history
    FOR prop_record IN 
        SELECT p.id, p.monthly_rent, p.lease_start_date,
               pa.tenant_id
        FROM properties p
        LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
        WHERE p.status = 'occupied' 
        AND p.monthly_rent > 0
        AND p.deleted_at IS NULL
        LIMIT 10 -- Limit to avoid too much test data
    LOOP
        -- Create rent payments for the last 6 months
        FOR months_back IN 0..5 LOOP
            due_date_calc := (CURRENT_DATE - INTERVAL '1 month' * months_back)::DATE;
            
            -- Skip if before lease start
            IF prop_record.lease_start_date IS NOT NULL AND due_date_calc < prop_record.lease_start_date THEN
                CONTINUE;
            END IF;
            
            -- Create rent payment record (80% chance of being paid on time, 20% late/unpaid)
            INSERT INTO rent_payments (
                property_id,
                tenant_id, 
                amount,
                due_date,
                payment_date,
                status,
                days_late
            ) VALUES (
                prop_record.id,
                prop_record.tenant_id,
                prop_record.monthly_rent,
                due_date_calc,
                CASE 
                    -- 60% paid on time
                    WHEN random() < 0.6 THEN due_date_calc
                    -- 20% paid late
                    WHEN random() < 0.8 THEN due_date_calc + (random() * 15)::INTEGER
                    -- 20% unpaid (leave payment_date null)
                    ELSE NULL
                END,
                CASE 
                    WHEN random() < 0.6 THEN 'completed'
                    WHEN random() < 0.8 THEN 'late'
                    ELSE 'pending'
                END,
                CASE 
                    WHEN random() < 0.6 THEN 0
                    WHEN random() < 0.8 THEN (random() * 15)::INTEGER
                    ELSE (CURRENT_DATE - due_date_calc)::INTEGER
                END
            );
        END LOOP;
    END LOOP;
END $$;

-- Update all property outstanding balances
SELECT update_property_outstanding_balances();