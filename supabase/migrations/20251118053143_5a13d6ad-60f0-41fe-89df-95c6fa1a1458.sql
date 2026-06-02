-- Fix bad data: Clear move_in_date for property unit 2F since there's no lease signed yet
UPDATE property_units 
SET move_in_date = NULL
WHERE id = 'f75e24eb-d428-4023-b7bd-609cc3a7b950';

-- Add check constraints to prevent illogical date sequences in the future
ALTER TABLE property_units 
ADD CONSTRAINT check_lease_before_move_in 
CHECK (
  move_in_date IS NULL OR 
  lease_signed_date IS NULL OR 
  lease_signed_date <= move_in_date
);

ALTER TABLE property_units 
ADD CONSTRAINT check_move_in_before_payment 
CHECK (
  payment_received_date IS NULL OR 
  move_in_date IS NULL OR 
  move_in_date <= payment_received_date
);

COMMENT ON CONSTRAINT check_lease_before_move_in ON property_units IS 
'Ensures lease is signed before or on move-in date';

COMMENT ON CONSTRAINT check_move_in_before_payment ON property_units IS 
'Ensures move-in happens before or on payment received date';