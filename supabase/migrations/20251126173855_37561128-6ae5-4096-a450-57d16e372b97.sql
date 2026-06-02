-- Fix the incorrect landlord signature for application e0dd51f6-ee7b-4fd7-988a-5bd9dbc8ff33
UPDATE marketplace_applications
SET landlord_signature_name = 'Logan Bauer'
WHERE id = 'e0dd51f6-ee7b-4fd7-988a-5bd9dbc8ff33';