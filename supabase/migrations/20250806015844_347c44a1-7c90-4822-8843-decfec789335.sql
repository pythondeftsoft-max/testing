-- Fix gift card images with high-quality, brand-appropriate alternatives
UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Apple Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Google Play Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Walmart Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Best Buy Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Netflix Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Uber Eats Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%DoorDash Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Starbucks Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Home Depot Gift Card%';

UPDATE public.rewards SET image_url = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop&auto=format&q=80' WHERE name LIKE '%Lowe''s Gift Card%';