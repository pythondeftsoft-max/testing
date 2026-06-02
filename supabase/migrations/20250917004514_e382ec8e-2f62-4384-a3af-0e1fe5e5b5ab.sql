-- Add missing fields to properties table for Property Statement calculations
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_security_deposits_held numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_additions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_subtractions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS beginning_cash_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_cash_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_contributions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_draws numeric DEFAULT 0;