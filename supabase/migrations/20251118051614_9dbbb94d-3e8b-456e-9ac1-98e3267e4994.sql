-- Add new date tracking columns to property_units table (only if they don't exist)
DO $$ 
BEGIN
  -- Add lease_signed_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'lease_signed_date'
  ) THEN
    ALTER TABLE property_units ADD COLUMN lease_signed_date TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN property_units.lease_signed_date IS 'Date when tenant signed lease for this unit';
  END IF;

  -- Add payment_due_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE property_units ADD COLUMN payment_due_date TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN property_units.payment_due_date IS 'Date when landlord payment is due';
  END IF;

  -- Add payment_received_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'payment_received_date'
  ) THEN
    ALTER TABLE property_units ADD COLUMN payment_received_date TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN property_units.payment_received_date IS 'Date when landlord placement fee was received';
  END IF;
END $$;