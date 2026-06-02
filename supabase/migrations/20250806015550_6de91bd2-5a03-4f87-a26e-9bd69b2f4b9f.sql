-- Add more gift card rewards to the rewards catalog
INSERT INTO public.rewards (name, type, cost, description, status, image_url) VALUES
-- Apple/iTunes Gift Cards
('$15 Apple Gift Card', 'gift_card', 1500, 'Perfect for apps, music, movies, and more from the App Store and iTunes', 'active', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop&auto=format'),
('$25 Apple Gift Card', 'gift_card', 2500, 'Great for downloading apps, games, music, and entertainment content', 'active', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop&auto=format'),
('$50 Apple Gift Card', 'gift_card', 5000, 'Ideal for larger purchases on the App Store, iTunes, and Apple services', 'active', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop&auto=format'),

-- Google Play Gift Cards
('$15 Google Play Gift Card', 'gift_card', 1500, 'Use for apps, games, movies, and books on Google Play Store', 'active', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=300&h=200&fit=crop&auto=format'),
('$25 Google Play Gift Card', 'gift_card', 2500, 'Perfect for Android apps, games, and digital content purchases', 'active', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=300&h=200&fit=crop&auto=format'),

-- Walmart Gift Cards
('$25 Walmart Gift Card', 'gift_card', 2500, 'Great for everyday shopping, groceries, and household essentials', 'active', 'https://images.unsplash.com/photo-1590273840693-2c9b8eeddf98?w=300&h=200&fit=crop&auto=format'),
('$50 Walmart Gift Card', 'gift_card', 5000, 'Perfect for larger shopping trips and family necessities', 'active', 'https://images.unsplash.com/photo-1590273840693-2c9b8eeddf98?w=300&h=200&fit=crop&auto=format'),

-- Best Buy Gift Cards
('$25 Best Buy Gift Card', 'gift_card', 2500, 'Ideal for electronics, tech accessories, and gadgets', 'active', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop&auto=format'),
('$50 Best Buy Gift Card', 'gift_card', 5000, 'Great for larger tech purchases and electronic devices', 'active', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop&auto=format'),

-- Netflix Gift Cards
('$15 Netflix Gift Card', 'gift_card', 1500, 'Enjoy streaming movies, TV shows, and original content', 'active', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&h=200&fit=crop&auto=format'),
('$30 Netflix Gift Card', 'gift_card', 3000, 'Perfect for extended streaming entertainment for the whole family', 'active', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&h=200&fit=crop&auto=format'),

-- Food Delivery Gift Cards
('$20 Uber Eats Gift Card', 'gift_card', 2000, 'Convenient food delivery from your favorite local restaurants', 'active', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop&auto=format'),
('$25 DoorDash Gift Card', 'gift_card', 2500, 'Get meals delivered from thousands of restaurants nationwide', 'active', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=200&fit=crop&auto=format'),

-- Additional Starbucks Option
('$25 Starbucks Gift Card', 'gift_card', 2500, 'Enjoy premium coffee, beverages, and food at any Starbucks location', 'active', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=200&fit=crop&auto=format'),

-- Home Improvement Gift Cards
('$25 Home Depot Gift Card', 'gift_card', 2500, 'Perfect for home improvement projects and DIY needs', 'active', 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop&auto=format'),
('$50 Lowe''s Gift Card', 'gift_card', 5000, 'Great for home renovation, garden supplies, and tools', 'active', 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop&auto=format');