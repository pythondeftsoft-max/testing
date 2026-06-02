-- Update the asset_charge_cadence enum to use 'annually' instead of 'yearly'
ALTER TYPE asset_charge_cadence RENAME VALUE 'yearly' TO 'annually';