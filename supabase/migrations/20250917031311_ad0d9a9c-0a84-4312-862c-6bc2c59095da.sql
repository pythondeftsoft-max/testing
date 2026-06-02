-- Clean up artificial sample data from properties table
-- Reset fields that have obvious artificial patterns to NULL

UPDATE properties 
SET 
  -- Reset expense fields with artificial decimal patterns
  property_taxes = CASE 
    WHEN property_taxes IS NOT NULL AND (
      property_taxes::text LIKE '%.67' OR 
      property_taxes::text LIKE '%.33' OR 
      property_taxes::text LIKE '%.88' OR
      property_taxes > monthly_rent
    ) THEN NULL 
    ELSE property_taxes 
  END,
  
  insurance_cost = CASE 
    WHEN insurance_cost IS NOT NULL AND (
      insurance_cost::text LIKE '%.%' AND 
      insurance_cost::text NOT LIKE '%.00' AND
      insurance_cost != ROUND(insurance_cost)
    ) THEN NULL 
    ELSE insurance_cost 
  END,
  
  utilities_expense = CASE 
    WHEN utilities_expense IS NOT NULL AND (
      utilities_expense::text LIKE '%.%' AND 
      utilities_expense::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE utilities_expense 
  END,
  
  -- Reset other artificial fields
  pet_fee_income = CASE 
    WHEN pet_fee_income IS NOT NULL AND (
      pet_fee_income::text LIKE '%.%' AND 
      pet_fee_income::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE pet_fee_income 
  END,
  
  other_income = CASE 
    WHEN other_income IS NOT NULL AND (
      other_income::text LIKE '%.%' AND 
      other_income::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE other_income 
  END,
  
  accounts_receivable = CASE 
    WHEN accounts_receivable IS NOT NULL AND (
      accounts_receivable::text LIKE '%.%' AND 
      accounts_receivable::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE accounts_receivable 
  END,
  
  security_deposits_held = CASE 
    WHEN security_deposits_held IS NOT NULL AND (
      security_deposits_held = monthly_rent * 1.5 OR
      security_deposits_held::text LIKE '%.%' AND 
      security_deposits_held::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE security_deposits_held 
  END,
  
  accounts_payable = CASE 
    WHEN accounts_payable IS NOT NULL AND (
      accounts_payable::text LIKE '%.%' AND 
      accounts_payable::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE accounts_payable 
  END,
  
  accrued_expenses = CASE 
    WHEN accrued_expenses IS NOT NULL AND (
      accrued_expenses::text LIKE '%.%' AND 
      accrued_expenses::text NOT LIKE '%.00'
    ) THEN NULL 
    ELSE accrued_expenses 
  END,

  -- Reset other artificial financial fields
  beginning_cash_balance = NULL,
  ending_cash_balance = NULL,
  advertising_expense = NULL,
  legal_professional_fees = NULL,
  late_fee_income = NULL,
  application_fee_income = NULL

WHERE 
  -- Only reset properties that appear to have artificial data
  (property_taxes IS NOT NULL AND property_taxes::text LIKE '%.%' AND property_taxes::text NOT LIKE '%.00') OR
  (insurance_cost IS NOT NULL AND insurance_cost::text LIKE '%.%' AND insurance_cost::text NOT LIKE '%.00') OR
  (utilities_expense IS NOT NULL AND utilities_expense::text LIKE '%.%' AND utilities_expense::text NOT LIKE '%.00') OR
  (accounts_receivable IS NOT NULL AND accounts_receivable::text LIKE '%.%' AND accounts_receivable::text NOT LIKE '%.00') OR
  (security_deposits_held = monthly_rent * 1.5) OR
  (beginning_cash_balance IS NOT NULL) OR
  (ending_cash_balance IS NOT NULL);

-- Remove artificial rent payment records
DELETE FROM rent_payments 
WHERE 
  -- Remove payments with artificial patterns or created during testing
  (amount::text LIKE '%.%' AND amount::text NOT LIKE '%.00') OR
  (created_at >= '2025-09-17' AND payment_date = due_date + INTERVAL '2 days') OR
  -- Remove payments where tenant_id doesn't correspond to actual tenant
  tenant_id NOT IN (
    SELECT DISTINCT pa.tenant_id 
    FROM property_applications pa 
    WHERE pa.status = 'approved' AND pa.tenant_id IS NOT NULL
  );