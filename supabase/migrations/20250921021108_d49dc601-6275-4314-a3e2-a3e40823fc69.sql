-- Add missing financial fields to properties table for accurate rent roll reporting
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS rent_cycle text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS prepayments_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_held numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance_due numeric DEFAULT 0;

-- Add lease tracking fields for proper lease status determination
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS lease_start_date date,
ADD COLUMN IF NOT EXISTS lease_end_date date;

-- Update property_units table to have proper financial tracking if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_units' AND table_schema = 'public') THEN
        -- Add missing fields to property_units if the table exists
        ALTER TABLE public.property_units 
        ADD COLUMN IF NOT EXISTS security_deposit_amount numeric DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_tenant_id uuid,
        ADD COLUMN IF NOT EXISTS lease_start_date date,
        ADD COLUMN IF NOT EXISTS lease_end_date date;
    END IF;
END $$;