UPDATE property_pushes 
SET status = 'landlord_review', 
    updated_at = now() 
WHERE status = 'interested';