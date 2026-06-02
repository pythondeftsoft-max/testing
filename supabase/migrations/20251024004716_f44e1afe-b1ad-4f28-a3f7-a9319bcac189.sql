-- Transfer maintenance requests to kohlniks@gmail.com account
UPDATE maintenance_requests 
SET tenant_id = '971d14a4-65e3-4a50-9187-28f3b1b2325f'
WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2';

-- Transfer property unit assignment to kohlniks@gmail.com account  
UPDATE property_units
SET tenant_id = '971d14a4-65e3-4a50-9187-28f3b1b2325f'
WHERE id = 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c';