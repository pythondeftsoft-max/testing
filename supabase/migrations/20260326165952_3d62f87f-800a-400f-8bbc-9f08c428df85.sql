-- Clean up scout properties with bad addresses - include row number for uniqueness
-- Use a CTE with row_number to generate unique addresses per owner+city combo
WITH numbered AS (
  SELECT id, city, state, address as old_address, description,
    ROW_NUMBER() OVER (PARTITION BY owner_id, city, state ORDER BY created_at) as rn,
    COUNT(*) OVER (PARTITION BY owner_id, city, state) as total
  FROM properties
  WHERE (
    address LIKE '%Section 8%' 
    OR address LIKE '%Houses for Rent%' 
    OR address LIKE '%Rental Properties%'
    OR address LIKE '%Properties in%'
    OR address LIKE '%Housing%'
    OR address LIKE '%Looking For%'
    OR address LIKE '%Bed / %'
  )
  AND city IS NOT NULL 
  AND state IS NOT NULL
)
UPDATE properties p
SET 
  description = CASE WHEN p.description IS NULL OR p.description = '' THEN n.old_address ELSE p.description END,
  address = n.city || ', ' || n.state || ' #' || n.rn
FROM numbered n
WHERE p.id = n.id;