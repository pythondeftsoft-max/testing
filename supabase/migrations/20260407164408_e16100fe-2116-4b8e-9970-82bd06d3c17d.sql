
-- ==================== PASS 3: Final TX and remaining matches ====================

-- Dallas Housing / DHA variants in TX
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'dallas housing', 'dallas housing authorities', 'dallas choice',
    'dha housing solutions for north texas', 'dha section 8',
    'oakland housing authority', 'dekalb', 'texas',
    'princeton plano mckinney mesquite allen', 'rapid rehousing'
  );

-- Fort Worth variants in TX
UPDATE tenant_profiles SET housing_authority_id = '896f94b4-93fd-461f-86c9-371fc66de879'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'fort worth housing', 'fort worth housing solutions', 'fwhs',
    'forest hill'
  );

-- Grand Prairie misspellings
UPDATE tenant_profiles SET housing_authority_id = '2c662e0a-728d-4180-ae10-836cb623f398'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('grandprairie', 'grandprais');

-- Houston variants
UPDATE tenant_profiles SET housing_authority_id = '00feda42-8b0b-4af4-846f-8022f213bd1c'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'houston alliance', 'houston alliance htx', 'houston housing authorities',
    'houston /harris'
  );

-- Harris County variants
UPDATE tenant_profiles SET housing_authority_id = '61fc9f9a-39f5-4375-9027-7d250e8845c1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'harris county/ houston texas', 'webster'
  );

-- Tarrant County variant
UPDATE tenant_profiles SET housing_authority_id = '94620105-2cca-403d-9ad7-b6df366336e1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('tarrant county housing');

-- Ellis County TX (no exact HA, use Ennis which is in Ellis County)
UPDATE tenant_profiles SET housing_authority_id = '0e8201ed-ded3-4f1c-8cfb-a137c26169b4'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('ellis county', 'ennis');

-- Rowlett TX → Dallas area
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('rowlett', 'forney');

-- Marshall TX
UPDATE tenant_profiles SET housing_authority_id = 'ca704294-e0c0-4c7f-b7df-83576b17de9d'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('marshall');

-- Nacogdoches TX
UPDATE tenant_profiles SET housing_authority_id = '9b0e0109-6b48-47eb-98a4-46c9a5c7750c'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('nacogdoches');

-- TX "city" with Houston-area zip
UPDATE tenant_profiles SET housing_authority_id = '00feda42-8b0b-4af4-846f-8022f213bd1c'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) = 'city' AND zip_code LIKE '770%';

-- Richmond VA
UPDATE tenant_profiles SET housing_authority_id = '8da51a42-38a6-4eb8-801d-8452aea7d3de'
WHERE housing_authority_id IS NULL AND state = 'VA'
  AND LOWER(TRIM(housing_authority)) IN ('richmond');

-- VA "decatur housing" with Newport News zip 23608
UPDATE tenant_profiles SET housing_authority_id = 'bfc58b5d-a411-4c62-a6f6-63ab2f3903e1'
WHERE housing_authority_id IS NULL AND state = 'VA'
  AND zip_code = '23608';

-- Detroit MI "cash only" variant
UPDATE tenant_profiles SET housing_authority_id = 'ec5cc33c-09b7-4878-9af4-67baedf0f2a4'
WHERE housing_authority_id IS NULL AND state = 'MI'
  AND LOWER(TRIM(housing_authority)) LIKE 'detroit%';

-- CityFHEPS voucher (no state set)
UPDATE tenant_profiles SET housing_authority_id = '26ae0f27-b4bc-4d42-ac81-02b8fd1d7535'
WHERE housing_authority_id IS NULL AND state IS NULL
  AND LOWER(TRIM(housing_authority)) LIKE '%cityfheps%';
