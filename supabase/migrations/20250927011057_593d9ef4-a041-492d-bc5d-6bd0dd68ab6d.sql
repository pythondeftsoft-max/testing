-- Add missing fields to properties table for rental owner statements
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS owner_contributions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_draws NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_security_deposits_held NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_reserve NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS beginning_cash_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_cash_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_income NUMERIC DEFAULT 0;