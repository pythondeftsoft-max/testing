-- Reset artificial financial sample data to clean state
-- This removes the fake financial data that was added during testing
-- and ensures only real user-entered data is preserved

-- Reset all artificial financial fields to NULL for properties with obvious sample data patterns
UPDATE properties 
SET 
  -- Income fields
  rental_income = NULL,
  other_income = NULL,
  late_fee_income = NULL,
  pet_fee_income = NULL,
  application_fee_income = NULL,
  
  -- Expense fields  
  property_taxes = NULL,
  insurance_cost = NULL,
  utilities_cost = NULL,
  maintenance_cost = NULL,
  management_fee = NULL,
  advertising_cost = NULL,
  legal_fees = NULL,
  accounting_fees = NULL,
  repairs_cost = NULL,
  supplies_cost = NULL,
  landscaping_cost = NULL,
  snow_removal_cost = NULL,
  pest_control_cost = NULL,
  cleaning_cost = NULL,
  turnover_cost = NULL,
  
  -- Asset fields
  land_value = NULL,
  building_value = NULL,
  fixtures_value = NULL,
  appliances_value = NULL,
  furniture_value = NULL,
  accumulated_depreciation = NULL,
  accounts_receivable = NULL,
  prepaid_expenses = NULL,
  security_deposit_asset = NULL,
  
  -- Liability fields
  mortgage_balance = NULL,
  accounts_payable = NULL,
  accrued_expenses = NULL,
  security_deposits_held = NULL,
  deferred_rent = NULL,
  
  -- Advanced fields
  depreciation_expense = NULL,
  interest_expense = NULL,
  principal_payment = NULL,
  capital_improvements = NULL,
  tenant_improvements = NULL
WHERE 
  -- Target properties with artificial decimal patterns (sample data indicators)
  (rental_income::text LIKE '%.%' AND rental_income != monthly_rent) OR
  (property_taxes::text LIKE '%.67' OR property_taxes::text LIKE '%.33' OR property_taxes::text LIKE '%.88') OR
  (insurance_cost::text LIKE '%.%' AND insurance_cost::text NOT LIKE '%.00') OR
  -- Properties where financial data doesn't match expected patterns
  (rental_income IS NOT NULL AND rental_income > monthly_rent * 1.5) OR
  (property_taxes IS NOT NULL AND property_taxes > monthly_rent);

-- Remove artificial rent payment records that were created during testing
-- Keep only payments that look like real user data
DELETE FROM rent_payments 
WHERE 
  -- Remove payments with artificial patterns
  (amount::text LIKE '%.%' AND amount::text NOT LIKE '%.00') OR
  -- Remove payments that are suspiciously perfect multiples
  (payment_date >= '2024-01-01' AND created_at > '2025-01-01') OR
  -- Remove payments where the amount doesn't match property rent
  (amount NOT IN (
    SELECT DISTINCT monthly_rent 
    FROM properties 
    WHERE monthly_rent IS NOT NULL AND monthly_rent > 0
  ));

-- Ensure new properties start with clean financial data
-- Set default values for key financial fields to 0 instead of NULL where appropriate
UPDATE properties 
SET 
  rental_income = COALESCE(monthly_rent, 0),
  other_income = 0,
  property_taxes = 0,
  insurance_cost = 0,
  maintenance_cost = 0,
  management_fee = 0
WHERE 
  -- Only update if the fields are currently NULL and we have basic property info
  rental_income IS NULL AND 
  monthly_rent IS NOT NULL AND 
  monthly_rent > 0 AND
  created_at > '2025-01-01'; -- Only recent properties to avoid overwriting real data