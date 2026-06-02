
-- ============================================================
-- ONE-TIME BACKFILL: Link tenant_profiles to housing_authorities
-- Multi-pass fuzzy matching by text, state, and zip
-- ============================================================

-- ==================== TEXAS ====================
-- Dallas / DHA variants → Housing Authority of the City of Dallas
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'dha', 'dallas', 'dallas housing authority', 'dallas tx',
    'dallas (dha)', 'dallas dha', 'dha housing solutions',
    'housing authority of the city of dallas', 'city of dallas'
  );

-- Dallas County variants
UPDATE tenant_profiles SET housing_authority_id = '75cd4282-f185-47cf-a939-69adc2ab762c'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN (
    'dallas county', 'dallas county housing agency', 'dallas county section 8',
    'dallas county housing assistance program'
  );

-- Grand Prairie
UPDATE tenant_profiles SET housing_authority_id = '2c662e0a-728d-4180-ae10-836cb623f398'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('grand prairie', 'grand prairie housing');

-- Mesquite
UPDATE tenant_profiles SET housing_authority_id = '025e93a0-88ee-4269-958d-b40ad4941f33'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('mesquite', 'city of mesquite');

-- Arlington
UPDATE tenant_profiles SET housing_authority_id = 'b299cb86-0307-40e3-b148-79c9d477c364'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('arlington', 'arlington housing authority');

-- Fort Worth
UPDATE tenant_profiles SET housing_authority_id = '896f94b4-93fd-461f-86c9-371fc66de879'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('fort worth', 'ft worth', 'housing authority of fort worth');

-- Garland
UPDATE tenant_profiles SET housing_authority_id = 'bf3f3047-221b-41cd-ac97-ce40517bfcd2'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('garland', 'garland housing authority');

-- Denton
UPDATE tenant_profiles SET housing_authority_id = '851bc44a-35fb-4b5a-8af5-516a39c6937b'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('denton', 'denton/denton', 'denton housing authority');

-- Houston
UPDATE tenant_profiles SET housing_authority_id = '00feda42-8b0b-4af4-846f-8022f213bd1c'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('houston', 'houston texas', 'houston housing authority');

-- Tarrant County
UPDATE tenant_profiles SET housing_authority_id = '94620105-2cca-403d-9ad7-b6df366336e1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('tarrant', 'tarrant county');

-- Harris County
UPDATE tenant_profiles SET housing_authority_id = '61fc9f9a-39f5-4375-9027-7d250e8845c1'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('harris', 'harris county', 'baytown/harris');

-- McKinney
UPDATE tenant_profiles SET housing_authority_id = '6d06be36-a479-4d1a-99b4-6d8e7aa6951a'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('mckinney');

-- Irving
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('irving');

-- Plano
UPDATE tenant_profiles SET housing_authority_id = '72c19a3d-194b-4625-82bc-7691a93a9633'
WHERE housing_authority_id IS NULL AND state = 'TX'
  AND LOWER(TRIM(housing_authority)) IN ('plano');

-- ==================== GEORGIA ====================
-- Atlanta / AHA → Housing Authority of the City of Atlanta
UPDATE tenant_profiles SET housing_authority_id = '5cfce7ff-f596-490b-b5c8-1c46329f1cb1'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN (
    'atlanta', 'aha', 'atlanta housing authority', 'city of atlanta',
    'atlanta housing', 'atlanta ha'
  );

-- Fulton County
UPDATE tenant_profiles SET housing_authority_id = 'aa64c70b-a0fa-4279-8c2f-5c23a2100e79'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('fulton', 'fulton county');

-- DeKalb County
UPDATE tenant_profiles SET housing_authority_id = 'e77b77bd-c9b9-4a58-9913-2535f1d37e68'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('dekalb', 'dekalb county ga', 'dekalb county', 'stone mtn');

-- College Park
UPDATE tenant_profiles SET housing_authority_id = '5b47540a-bd06-42de-813f-2f56851b354e'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('college park');

-- East Point
UPDATE tenant_profiles SET housing_authority_id = 'a60d36b6-5cd5-49f9-93ee-c5a235d1cb22'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('east point');

-- DCA / Dept of Community Affairs → Georgia Residential Finance
UPDATE tenant_profiles SET housing_authority_id = '7fa89408-5240-4771-8004-27ca5c134a7c'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('dca', 'department of community affairs');

-- Jonesboro
UPDATE tenant_profiles SET housing_authority_id = '3c35f3b7-6797-4971-98f6-261b8da86c7b'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('jonesboro', 'jonesboro housing');

-- Cobb County / Marietta
UPDATE tenant_profiles SET housing_authority_id = '402df2ce-6b0b-4567-ad68-9cb4fe58faf1'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('cobb county/mha', 'marietta', 'powder spgs', 'powder springs');

-- Albany / Dougherty
UPDATE tenant_profiles SET housing_authority_id = '197650cd-4ddb-49bc-a185-ce235cc7541f'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) IN ('albany/dougherty', 'albany', 'dougherty');

-- Gulfport in GA (likely Covington area based on zip 30016)
UPDATE tenant_profiles SET housing_authority_id = '7821bb54-1b2d-4d64-a7b9-bdbbee17e492'
WHERE housing_authority_id IS NULL AND state = 'GA'
  AND LOWER(TRIM(housing_authority)) = 'gulfport';

-- ==================== NEW YORK ====================
-- All NYC boroughs and programs → NYCHA
UPDATE tenant_profiles SET housing_authority_id = '26ae0f27-b4bc-4d42-ac81-02b8fd1d7535'
WHERE housing_authority_id IS NULL AND state = 'NY'
  AND LOWER(TRIM(housing_authority)) IN (
    'bronx', 'brooklyn', 'queens', 'new york', 'staten island',
    'cityfheps', 'fheps', 'hra', 'hasa', 'sota',
    'drew hamilton', 'ocean bay', 'homebase',
    'nueva york brooklyn', 'new york city', 'nycha',
    'manhattan', 'new york housing authority',
    'new york city housing authority', 'nyc',
    'cityfheps/hra', 'city fheps'
  );

-- Nassau County (Long Island) → Town of Hempstead
UPDATE tenant_profiles SET housing_authority_id = '48b0a9ee-29f7-4ccd-a249-09ba57557d03'
WHERE housing_authority_id IS NULL AND state = 'NY'
  AND LOWER(TRIM(housing_authority)) IN ('nassau', 'hempstead', 'nassau county');

-- ==================== MICHIGAN ====================
-- Detroit
UPDATE tenant_profiles SET housing_authority_id = 'ec5cc33c-09b7-4878-9af4-67baedf0f2a4'
WHERE housing_authority_id IS NULL AND state = 'MI'
  AND LOWER(TRIM(housing_authority)) IN ('detroit', 'rpi management', 'rpi management dearborn', 'rpi');

-- Wayne
UPDATE tenant_profiles SET housing_authority_id = 'fab91418-643d-4bea-8c8e-2f2d8ce7c3a3'
WHERE housing_authority_id IS NULL AND state = 'MI'
  AND LOWER(TRIM(housing_authority)) IN ('wayne', 'wayne county');

-- Dearborn
UPDATE tenant_profiles SET housing_authority_id = '0d4ce63e-e96a-41ae-b74f-bad441e70d59'
WHERE housing_authority_id IS NULL AND state = 'MI'
  AND LOWER(TRIM(housing_authority)) IN ('dearborn');

-- ==================== MISSOURI ====================
-- Saint Louis
UPDATE tenant_profiles SET housing_authority_id = '35de46b2-16fa-4165-ba9e-b9fd599c7bbe'
WHERE housing_authority_id IS NULL AND state = 'MO'
  AND LOWER(TRIM(housing_authority)) IN (
    'saint louis', 'st louis', 'st. louis', 'city',
    'metropolitan housing authority', 'dha'
  );

-- ==================== ILLINOIS ====================
-- Chicago Housing Authority
UPDATE tenant_profiles SET housing_authority_id = 'a49d1c35-144b-416d-b082-ebdd5765499c'
WHERE housing_authority_id IS NULL AND state = 'IL'
  AND LOWER(TRIM(housing_authority)) IN ('chicago housing authority', 'chicago');

-- Decatur IL
UPDATE tenant_profiles SET housing_authority_id = '92145e2c-1a6c-4f7f-81ef-cc171bfe8f80'
WHERE housing_authority_id IS NULL AND state = 'IL'
  AND LOWER(TRIM(housing_authority)) IN ('decatur housing', 'decatur');

-- Schaumburg → Cook County HA
UPDATE tenant_profiles SET housing_authority_id = '2863f555-f74d-4db1-a8dd-b80e671f88fb'
WHERE housing_authority_id IS NULL AND state = 'IL'
  AND LOWER(TRIM(housing_authority)) IN ('schaumburg', 'cook county');

-- ==================== OTHER STATES ====================
-- Shreveport LA
UPDATE tenant_profiles SET housing_authority_id = '8e91c755-2781-4152-b571-fd74b7fbd7f9'
WHERE housing_authority_id IS NULL AND state = 'LA'
  AND LOWER(TRIM(housing_authority)) IN ('shreveport housing authority', 'shreveport');

-- Wake County NC
UPDATE tenant_profiles SET housing_authority_id = '8cafc2a9-5a6b-4784-accf-e91e083af115'
WHERE housing_authority_id IS NULL AND state = 'NC'
  AND LOWER(TRIM(housing_authority)) IN ('wake county housing authority', 'wake county');

-- Fayetteville NC (harris housing authority likely = Fayetteville area zip 28312)
UPDATE tenant_profiles SET housing_authority_id = '40f2c678-ba14-44ad-b58b-68a9bbcb049c'
WHERE housing_authority_id IS NULL AND state = 'NC'
  AND LOWER(TRIM(housing_authority)) IN ('harris housing authority', 'fayetteville');

-- Union NC → skip, no clear match

-- New Castle County DE
UPDATE tenant_profiles SET housing_authority_id = '91dd2881-159b-4250-bd72-82710789230e'
WHERE housing_authority_id IS NULL AND state = 'DE'
  AND LOWER(TRIM(housing_authority)) IN ('new castle county');

-- San Bernardino CA
UPDATE tenant_profiles SET housing_authority_id = '1511103f-2af9-482f-be30-e21eed5981ce'
WHERE housing_authority_id IS NULL AND state = 'CA'
  AND LOWER(TRIM(housing_authority)) IN ('san bernardino');

-- Oakland CA (tenant entered "dallas" but is in CA zip 94601 = Oakland)
UPDATE tenant_profiles SET housing_authority_id = '076ce76f-5b10-4e2b-a4af-9429d3cf15e5'
WHERE housing_authority_id IS NULL AND state = 'CA'
  AND zip_code = '94601';

-- Saint Paul MN
UPDATE tenant_profiles SET housing_authority_id = '238ec13f-ea00-44c0-b98f-ba9336eeb15c'
WHERE housing_authority_id IS NULL AND state = 'MN'
  AND LOWER(TRIM(housing_authority)) IN ('saint paul', 'st paul');

-- MS Regional Housing Authority 7
UPDATE tenant_profiles SET housing_authority_id = 'faf2cebf-8f9d-4f1b-be14-d1c951394a81'
WHERE housing_authority_id IS NULL AND state = 'MS'
  AND LOWER(TRIM(housing_authority)) ILIKE '%regional%7%';

-- Union County NJ
UPDATE tenant_profiles SET housing_authority_id = 'cd60b3c6-fa54-4bb8-a9e1-03a739a4070b'
WHERE housing_authority_id IS NULL AND state = 'NJ'
  AND LOWER(TRIM(housing_authority)) IN ('union county');

-- Calhoun County AL (zip 36201 = Anniston area)
UPDATE tenant_profiles SET housing_authority_id = 'eb97bc81-598c-457b-ae62-099af3cc936d'
WHERE housing_authority_id IS NULL AND state = 'AL'
  AND LOWER(TRIM(housing_authority)) IN ('calhoun county');

-- Phoenix AZ (Jonesboro HA entered but in AZ)
UPDATE tenant_profiles SET housing_authority_id = '4e88f6fe-b085-4ce0-b957-49194f520eef'
WHERE housing_authority_id IS NULL AND state = 'AZ'
  AND zip_code = '85042';

-- San Francisco CA (wrong state - GA zip but entered SF)
-- Skip: tenant has zip 30328 (GA) but state CA — data conflict

-- Kansas City KS
UPDATE tenant_profiles SET housing_authority_id = 'a66cd7f9-2b85-4e0b-bded-eb8f46a5956b'
WHERE housing_authority_id IS NULL AND state = 'KS'
  AND zip_code = '66109';
