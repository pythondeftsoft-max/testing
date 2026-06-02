-- Comprehensive gift card cleanup with redemption safety
BEGIN;

-- Create a temporary table to track brand consolidation
CREATE TEMP TABLE brand_consolidation AS
SELECT 
  brand_name,
  keeper_id,
  duplicate_ids
FROM (
  -- Starbucks consolidation
  SELECT 
    'Starbucks' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%starbucks%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%starbucks%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%starbucks%') > 1
  
  UNION ALL
  
  -- Amazon consolidation
  SELECT 
    'Amazon' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%amazon%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%amazon%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%amazon%') > 1
  
  UNION ALL
  
  -- Apple consolidation
  SELECT 
    'Apple' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%apple%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%apple%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%apple%') > 1
  
  UNION ALL
  
  -- Target consolidation
  SELECT 
    'Target' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%target%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%target%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%target%') > 1
  
  UNION ALL
  
  -- Walmart consolidation
  SELECT 
    'Walmart' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%walmart%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%walmart%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%walmart%') > 1
  
  UNION ALL
  
  -- Uber consolidation
  SELECT 
    'Uber' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%uber%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%uber%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%uber%') > 1
  
  UNION ALL
  
  -- DoorDash consolidation
  SELECT 
    'DoorDash' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%doordash%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%doordash%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%doordash%') > 1
  
  UNION ALL
  
  -- Best Buy consolidation
  SELECT 
    'Best Buy' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%best buy%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%best buy%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%best buy%') > 1
  
  UNION ALL
  
  -- Home Depot consolidation
  SELECT 
    'Home Depot' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%home depot%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%home depot%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%home depot%') > 1
  
  UNION ALL
  
  -- Netflix consolidation
  SELECT 
    'Netflix' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%netflix%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%netflix%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%netflix%') > 1
  
  UNION ALL
  
  -- Google Play consolidation
  SELECT 
    'Google Play' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%google%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%google%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%google%') > 1
  
  UNION ALL
  
  -- Visa consolidation
  SELECT 
    'Visa' as brand_name,
    (SELECT id FROM rewards WHERE name ILIKE '%visa%' ORDER BY created_at LIMIT 1) as keeper_id,
    ARRAY(SELECT id FROM rewards WHERE name ILIKE '%visa%' ORDER BY created_at OFFSET 1) as duplicate_ids
  WHERE (SELECT COUNT(*) FROM rewards WHERE name ILIKE '%visa%') > 1
) consolidation_data
WHERE keeper_id IS NOT NULL AND array_length(duplicate_ids, 1) > 0;

-- Re-point redemptions from duplicates to keeper records
UPDATE redemptions 
SET reward_id = bc.keeper_id 
FROM brand_consolidation bc
WHERE reward_id = ANY(bc.duplicate_ids);

-- Delete duplicate records
DELETE FROM rewards 
WHERE id IN (
  SELECT UNNEST(duplicate_ids) 
  FROM brand_consolidation
);

-- Now standardize all gift card entries
UPDATE rewards SET 
  name = 'Starbucks Gift Card',
  description = 'Enjoy your favorite coffee, tea, and treats at any Starbucks location.',
  brand_category = 'food_drink',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%starbucks%';

UPDATE rewards SET 
  name = 'Amazon Gift Card',
  description = 'Shop millions of products on Amazon with this versatile gift card.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%amazon%';

UPDATE rewards SET 
  name = 'Apple Gift Card',
  description = 'Use for App Store, iTunes, Apple Music, iCloud, and Apple products.',
  brand_category = 'tech',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%apple%';

UPDATE rewards SET 
  name = 'Target Gift Card',
  description = 'Shop for everything you need at Target stores and online.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%target%';

UPDATE rewards SET 
  name = 'Walmart Gift Card',
  description = 'Shop for groceries, electronics, home goods and more at Walmart.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%walmart%';

UPDATE rewards SET 
  name = 'Uber Gift Card',
  description = 'Get rides and food delivery with Uber and Uber Eats.',
  brand_category = 'transportation',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%uber%';

UPDATE rewards SET 
  name = 'DoorDash Gift Card',
  description = 'Order food delivery from your favorite restaurants.',
  brand_category = 'food_drink',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%doordash%';

UPDATE rewards SET 
  name = 'Best Buy Gift Card',
  description = 'Shop for electronics, appliances, and tech at Best Buy.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%best buy%';

UPDATE rewards SET 
  name = 'Home Depot Gift Card',
  description = 'Perfect for home improvement projects and tools.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%home depot%';

UPDATE rewards SET 
  name = 'Lowe''s Gift Card',
  description = 'Shop for home improvement supplies and tools at Lowe''s.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%lowe%';

UPDATE rewards SET 
  name = 'Netflix Gift Card',
  description = 'Stream movies, TV shows, and original content on Netflix.',
  brand_category = 'entertainment',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%netflix%';

UPDATE rewards SET 
  name = 'Google Play Gift Card',
  description = 'Buy apps, games, movies, books, and more on Google Play.',
  brand_category = 'tech',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%google%';

UPDATE rewards SET 
  name = 'Visa Gift Card',
  description = 'Use anywhere Visa is accepted - the ultimate flexible gift card.',
  brand_category = 'general',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%visa%';

-- Safety pass: normalize any other gift card entries
UPDATE rewards SET 
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name ILIKE '%gift card%' 
  AND (is_flexible_amount = false OR conversion_rate != 100);

COMMIT;