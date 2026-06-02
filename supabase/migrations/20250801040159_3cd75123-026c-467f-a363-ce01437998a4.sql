-- Update fictional addresses to real ones for better geocoding success

-- Update Test property addresses to real Brooklyn addresses
UPDATE properties 
SET street_address = '123 Euclid Avenue'
WHERE id = '5a65574e-ffda-4034-917f-f402b2bd3430';

UPDATE properties 
SET street_address = '187 Euclid Avenue'
WHERE id = '640bec63-5c99-4b49-9eb3-ec14828999dc';

UPDATE properties 
SET street_address = '127 Euclid Avenue'
WHERE id = '83bbf428-7634-4e6b-9022-48eaa5ad09be';

UPDATE properties 
SET street_address = '189 Euclid Avenue'
WHERE id = '523c7f75-843e-4cdd-9be1-04cac9a2ab9a';

UPDATE properties 
SET street_address = '198 Atlantic Avenue'
WHERE id = 'c0e95e21-5b61-479b-960d-985468243b82';

-- Update Oak Park address to real one
UPDATE properties 
SET street_address = '123 Oak Park Avenue'
WHERE id = '5a171e64-4c61-4bee-909f-038b4fefc048';

-- Update Cicero address to real one
UPDATE properties 
SET street_address = '567 Cicero Avenue'
WHERE id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Update Springfield address to real one
UPDATE properties 
SET street_address = '123 South Grand Avenue', city = 'Springfield', state = 'IL'
WHERE id = 'caac563c-d2d5-4d34-8381-381256a9b7b5';

-- Update River North address to real one (Chicago downtown area)
UPDATE properties 
SET street_address = '890 North State Street'
WHERE id = 'cd31ba06-24d3-4566-962c-53f026ee08a1';

-- Add address for the empty property
UPDATE properties 
SET street_address = '100 Main Street', city = 'New York', state = 'NY', zipcode = '10001'
WHERE id = '9ed03125-82ab-4a2b-b05c-7302820fae87' AND street_address IS NULL;