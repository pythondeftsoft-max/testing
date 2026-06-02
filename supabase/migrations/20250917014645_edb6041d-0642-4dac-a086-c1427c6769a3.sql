-- Add missing financial fields for comprehensive Rental Owner Statement calculations
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS late_fee_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS laundry_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vending_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounting_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS repair_costs NUMERIC DEFAULT 0;