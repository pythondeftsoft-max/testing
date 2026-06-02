-- Clean up duplicate gift card entries and standardize naming/categories

-- Remove duplicate Starbucks entries (keep the first one created)
DELETE FROM rewards WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM rewards 
    WHERE name LIKE '%Starbucks%'
  ) t WHERE t.rn > 1
);

-- Remove duplicate Amazon entries (keep the first one created)
DELETE FROM rewards WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM rewards 
    WHERE name LIKE '%Amazon%'
  ) t WHERE t.rn > 1
);

-- Remove duplicate Apple entries (keep the first one created)
DELETE FROM rewards WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM rewards 
    WHERE name LIKE '%Apple%'
  ) t WHERE t.rn > 1
);

-- Update all remaining gift card entries to standardized format
UPDATE rewards SET 
  name = 'Starbucks Gift Card',
  description = 'Enjoy your favorite coffee, tea, and treats at any Starbucks location.',
  brand_category = 'food_drink',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Starbucks%';

UPDATE rewards SET 
  name = 'Amazon Gift Card',
  description = 'Shop millions of products on Amazon with this versatile gift card.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Amazon%';

UPDATE rewards SET 
  name = 'Apple Gift Card',
  description = 'Use for App Store, iTunes, Apple Music, iCloud, and Apple products.',
  brand_category = 'tech',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Apple%';

UPDATE rewards SET 
  name = 'Target Gift Card',
  description = 'Shop for everything you need at Target stores and online.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Target%';

UPDATE rewards SET 
  name = 'Walmart Gift Card',
  description = 'Shop for groceries, electronics, home goods and more at Walmart.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Walmart%';

UPDATE rewards SET 
  name = 'Uber Gift Card',
  description = 'Get rides and food delivery with Uber and Uber Eats.',
  brand_category = 'transportation',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Uber%';

UPDATE rewards SET 
  name = 'DoorDash Gift Card',
  description = 'Order food delivery from your favorite restaurants.',
  brand_category = 'food_drink',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%DoorDash%';

UPDATE rewards SET 
  name = 'Best Buy Gift Card',
  description = 'Shop for electronics, appliances, and tech at Best Buy.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Best Buy%';

UPDATE rewards SET 
  name = 'Home Depot Gift Card',
  description = 'Perfect for home improvement projects and tools.',
  brand_category = 'retail',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Home Depot%';

UPDATE rewards SET 
  name = 'Netflix Gift Card',
  description = 'Stream movies, TV shows, and original content on Netflix.',
  brand_category = 'tech',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Netflix%';

UPDATE rewards SET 
  name = 'Google Play Gift Card',
  description = 'Buy apps, games, movies, books, and more on Google Play.',
  brand_category = 'tech',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Google%';

UPDATE rewards SET 
  name = 'Visa Gift Card',
  description = 'Use anywhere Visa is accepted - the ultimate flexible gift card.',
  brand_category = 'general',
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE name LIKE '%Visa%';