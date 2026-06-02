-- Fix corrupted White Label price: 990000 cents → 9900 cents ($99.00)
UPDATE subscription_plans 
SET price = 9900 
WHERE id = 'white_label';