-- Clean up duplicate gift card entries and standardize naming/categories

-- First, delete duplicate entries (keeping the best ones)
DELETE FROM rewards WHERE id IN (
  -- Remove duplicate Starbucks entries (keep the flexible one)
  SELECT id FROM rewards 
  WHERE name LIKE '%Starbucks%' AND name != 'Starbucks Gift Card'
  LIMIT 10
);

-- Delete old non-flexible entries that have flexible counterparts
DELETE FROM rewards WHERE is_flexible_amount = false AND brand_category IS NOT NULL;

-- Update all remaining gift card entries to standardized format
UPDATE rewards SET 
  name = 'Starbucks Gift Card',
  description = 'Enjoy your favorite coffee, tea, and treats at any Starbucks location.',
  brand_category = 'food_drink'
WHERE name LIKE '%Starbucks%';

UPDATE rewards SET 
  name = 'Amazon Gift Card',
  description = 'Shop millions of products on Amazon with this versatile gift card.',
  brand_category = 'retail'
WHERE name LIKE '%Amazon%';

UPDATE rewards SET 
  name = 'Apple Gift Card',
  description = 'Use for App Store, iTunes, Apple Music, iCloud, and Apple products.',
  brand_category = 'tech'
WHERE name LIKE '%Apple%';

UPDATE rewards SET 
  name = 'Target Gift Card',
  description = 'Shop for everything you need at Target stores and online.',
  brand_category = 'retail'
WHERE name LIKE '%Target%';

UPDATE rewards SET 
  name = 'Walmart Gift Card',
  description = 'Shop for groceries, electronics, home goods and more at Walmart.',
  brand_category = 'retail'
WHERE name LIKE '%Walmart%';

UPDATE rewards SET 
  name = 'Uber Gift Card',
  description = 'Get rides and food delivery with Uber and Uber Eats.',
  brand_category = 'transportation'
WHERE name LIKE '%Uber%';

UPDATE rewards SET 
  name = 'DoorDash Gift Card',
  description = 'Order food delivery from your favorite restaurants.',
  brand_category = 'food_drink'
WHERE name LIKE '%DoorDash%';

UPDATE rewards SET 
  name = 'Best Buy Gift Card',
  description = 'Shop for electronics, appliances, and tech at Best Buy.',
  brand_category = 'retail'
WHERE name LIKE '%Best Buy%';

UPDATE rewards SET 
  name = 'Home Depot Gift Card',
  description = 'Perfect for home improvement projects and tools.',
  brand_category = 'retail'
WHERE name LIKE '%Home Depot%';

UPDATE rewards SET 
  name = 'Netflix Gift Card',
  description = 'Stream movies, TV shows, and original content on Netflix.',
  brand_category = 'tech'
WHERE name LIKE '%Netflix%';

UPDATE rewards SET 
  name = 'Google Play Gift Card',
  description = 'Buy apps, games, movies, books, and more on Google Play.',
  brand_category = 'tech'
WHERE name LIKE '%Google Play%';

UPDATE rewards SET 
  name = 'Visa Gift Card',
  description = 'Use anywhere Visa is accepted - the ultimate flexible gift card.',
  brand_category = 'general'
WHERE name LIKE '%Visa%';

-- Ensure all gift cards have proper flexible amount settings
UPDATE rewards SET 
  is_flexible_amount = true,
  min_amount = 5,
  max_amount = 500,
  conversion_rate = 100
WHERE brand_category IS NOT NULL AND is_flexible_amount = true;

-- Remove any remaining exact duplicates by name
DELETE FROM rewards a USING rewards b 
WHERE a.id > b.id 
AND a.name = b.name 
AND a.brand_category = b.brand_category;