-- Temporarily disable conflicting triggers
ALTER TABLE properties DISABLE TRIGGER trigger_auto_delist_on_soft_delete;
ALTER TABLE properties DISABLE TRIGGER trigger_ensure_occupied_rent;
ALTER TABLE properties DISABLE TRIGGER validate_property_status_trigger;

-- Perform the cleanup
UPDATE properties
SET 
  deleted_at = now(),
  deleted_by = (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
WHERE 
  id IN (
    '13c61a0d-64ba-4570-af92-4434ffb3ebd5',
    'fba16c50-d6ca-4147-b53c-88c4437a6d27',
    'edc643a0-2a70-4593-80e1-ef194d3043b7',
    '5bb381cd-0fcf-4eb4-9b3d-752aca64ebc8',
    '9f59faba-cfcc-466d-a31a-d40f9e7430b8',
    '6b2cbe9a-0733-4589-93d2-54657e6d0d71',
    '020ce147-6e30-4f34-9f04-6fad580f1d50',
    '44dbb66a-54dc-424b-9dca-baaf6e05af7a',
    '997af20d-1e36-4fd2-a476-1c5ebd369132',
    'ee5dd825-d9e2-48a3-975b-3bde8664c120',
    'c707d24d-f1d9-44fc-b21c-2f418e762d2d',
    'dcd8aad7-f86e-4827-adbf-17dbbdb61a59',
    'ce8bfa8d-e0b9-4e9f-b0f1-f1285864b4ce',
    '0c8708e7-5293-45ac-8b94-202b915fe9ae',
    'b03ef3cf-b008-4642-9403-5857fc123019',
    '8803709a-5a9e-4aea-8d99-01e9e65dad29',
    'f58df3d0-dc29-4801-83cf-c52266ba6dd6',
    '16934a34-e285-44a0-add1-ba9b584d5252',
    'a3aed06a-2ed1-44c9-af25-2c13c37960b7',
    '7984b0c4-b730-417d-b4a1-b61318f67c66',
    'f1fb068b-745b-4404-8ec2-fe2b4e6d55c6',
    '27b44196-9f06-4afd-b36e-683676ac08ed',
    'a0126063-9de7-492e-bf5b-7324d89fd61b',
    'e91365e1-a6e1-4afd-bd37-ea8d040349f9'
  )
  AND deleted_at IS NULL;

-- Re-enable triggers
ALTER TABLE properties ENABLE TRIGGER trigger_auto_delist_on_soft_delete;
ALTER TABLE properties ENABLE TRIGGER trigger_ensure_occupied_rent;
ALTER TABLE properties ENABLE TRIGGER validate_property_status_trigger;