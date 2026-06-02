
-- Fix 5194 Coney Island Avenue data - sync monthly_rent to match desired_rent
UPDATE properties 
SET monthly_rent = 2.00, updated_at = NOW()
WHERE id = '8c3bedb5-8058-42b2-b0b6-4e08579f0391';

UPDATE property_units 
SET monthly_rent = 2.00, updated_at = NOW()
WHERE property_id = '8c3bedb5-8058-42b2-b0b6-4e08579f0391';
