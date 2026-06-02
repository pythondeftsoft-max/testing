-- Fix corrupted marketplace_application where property_id was set to unit_id
UPDATE marketplace_applications 
SET property_id = '60d95547-27f3-4dc8-8828-383c4f2c7e2b' 
WHERE id = '00fcacfd-15bd-457e-a3c3-528703cb6cbe' 
  AND unit_id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';