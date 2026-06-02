-- Update gift card images with vendor-specific branded placeholders
UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/1DB954/FFFFFF?text=Starbucks+Gift+Card' WHERE name LIKE '%Starbucks%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/FF9900/000000?text=Amazon+Gift+Card' WHERE name LIKE '%Amazon%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/007AFF/FFFFFF?text=Apple+Gift+Card' WHERE name LIKE '%Apple%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/4285F4/FFFFFF?text=Google+Play+Card' WHERE name LIKE '%Google Play%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/E50914/FFFFFF?text=Netflix+Gift+Card' WHERE name LIKE '%Netflix%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/0071CE/FFFFFF?text=Walmart+Gift+Card' WHERE name LIKE '%Walmart%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/CC0000/FFFFFF?text=Target+Gift+Card' WHERE name LIKE '%Target%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/003BB3/FFFF00?text=Best+Buy+Card' WHERE name LIKE '%Best Buy%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/FF6600/FFFFFF?text=Home+Depot+Card' WHERE name LIKE '%Home Depot%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/004990/FFFFFF?text=Lowes+Gift+Card' WHERE name LIKE '%Lowe''s%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/1A237E/FFFFFF?text=Visa+Gift+Card' WHERE name LIKE '%Visa%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/FF3008/FFFFFF?text=DoorDash+Card' WHERE name LIKE '%DoorDash%';

UPDATE public.rewards SET image_url = 'https://via.placeholder.com/400x300/00D4AA/000000?text=Uber+Eats+Card' WHERE name LIKE '%Uber Eats%';