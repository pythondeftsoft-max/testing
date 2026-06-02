
-- ==================== PASS 2: Remaining matches ====================

-- NY typos and variants
UPDATE tenant_profiles SET housing_authority_id = '26ae0f27-b4bc-4d42-ac81-02b8fd1d7535'
WHERE housing_authority_id IS NULL AND state = 'NY'
  AND LOWER(TRIM(housing_authority)) IN (
    'new york, ny', 'cityfehps', 'bronx new york',
    'staten island. ny', 'fheps queens'
  );

-- Akron OH
UPDATE tenant_profiles SET housing_authority_id = 'b8b2e11e-e11a-4917-8eff-09ca13e653d3'
WHERE housing_authority_id IS NULL AND state = 'OH'
  AND LOWER(TRIM(housing_authority)) IN ('akron');

-- Cleveland OH (tenant entered "city" with zip 44121)
UPDATE tenant_profiles SET housing_authority_id = '61604493-9e25-4e10-aef4-b9c2c0974cdc'
WHERE housing_authority_id IS NULL AND state = 'OH'
  AND zip_code = '44121';

-- Allentown PA
UPDATE tenant_profiles SET housing_authority_id = '62d77ee3-46c9-4525-8cc4-1e5d87d200ab'
WHERE housing_authority_id IS NULL AND state = 'PA'
  AND LOWER(TRIM(housing_authority)) IN ('allentown pennsylvania', 'allentown');

-- Delaware County Housing Authority PA
UPDATE tenant_profiles SET housing_authority_id = 'd8762fc7-afa0-4fe9-922f-0b6bb508bf10'
WHERE housing_authority_id IS NULL AND state = 'PA'
  AND LOWER(TRIM(housing_authority)) IN ('delaware county housing authority');

-- Erie County PA
UPDATE tenant_profiles SET housing_authority_id = 'bacd9948-770b-4690-ae39-59b7503e7a4e'
WHERE housing_authority_id IS NULL AND state = 'PA'
  AND LOWER(TRIM(housing_authority)) IN ('erie county');

-- Chattanooga TN
UPDATE tenant_profiles SET housing_authority_id = '4cc13421-76cb-4bad-b709-ed621da2dadc'
WHERE housing_authority_id IS NULL AND state = 'TN'
  AND LOWER(TRIM(housing_authority)) IN ('chattanooga');

-- Clarksville/Montgomery TN
UPDATE tenant_profiles SET housing_authority_id = '28ef080b-69d4-418d-814b-41b4c104a154'
WHERE housing_authority_id IS NULL AND state = 'TN'
  AND LOWER(TRIM(housing_authority)) IN ('clarksville/montgomery', 'clarksville');

-- Memphis TN (tenant has GA zip 30127, data conflict but state=TN)
UPDATE tenant_profiles SET housing_authority_id = '75f946d3-2c4b-4c2b-8726-c81a37783320'
WHERE housing_authority_id IS NULL AND state = 'TN'
  AND LOWER(TRIM(housing_authority)) IN ('memphis');

-- SC State Housing Authority
UPDATE tenant_profiles SET housing_authority_id = 'c96faebe-0ed5-49ed-a40d-ea9f8564aa5e'
WHERE housing_authority_id IS NULL AND state = 'SC'
  AND LOWER(TRIM(housing_authority)) IN ('dca');

-- Valley Stream NY → Nassau County area
UPDATE tenant_profiles SET housing_authority_id = '48b0a9ee-29f7-4ccd-a249-09ba57557d03'
WHERE housing_authority_id IS NULL AND state = 'NY'
  AND LOWER(TRIM(housing_authority)) IN ('valley stream');

-- TX remaining: "city" with zip 75001 → Dallas area
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) = 'city' AND zip_code IN ('75001','75201','75202','75203','75204','75205','75206','75207','75208','75209','75210','75211','75212','75214','75215','75216','75217','75218','75219','75220','75223','75224','75225','75226','75227','75228','75229','75230','75231','75232','75233','75234','75235','75236','75237','75238','75240','75241','75243','75244','75246','75247','75248','75249','75250','75251','75252','75253','75254');

-- Humble TX → Harris County
UPDATE tenant_profiles SET housing_authority_id = '61fc9f9a-39f5-4375-9027-7d250e8845c1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('humble');

-- Mansfield TX → Tarrant County
UPDATE tenant_profiles SET housing_authority_id = '94620105-2cca-403d-9ad7-b6df366336e1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('mansfield');
