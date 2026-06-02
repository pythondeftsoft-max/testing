-- Transform rewards table to support flexible gift card amounts
-- Add new columns for flexible amount system
ALTER TABLE public.rewards 
ADD COLUMN min_amount NUMERIC DEFAULT 5.00,
ADD COLUMN max_amount NUMERIC DEFAULT 500.00,
ADD COLUMN conversion_rate NUMERIC DEFAULT 100.00, -- 100 points = $1
ADD COLUMN brand_category TEXT DEFAULT 'general',
ADD COLUMN is_flexible_amount BOOLEAN DEFAULT false;

-- Update existing rewards to be flexible amount brands
UPDATE public.rewards 
SET 
  is_flexible_amount = true,
  min_amount = 5.00,
  max_amount = 500.00,
  conversion_rate = 100.00,
  cost = 0, -- Set to 0 since cost will be dynamic
  brand_category = CASE 
    WHEN name ILIKE '%starbucks%' THEN 'food_drink'
    WHEN name ILIKE '%apple%' THEN 'tech'
    ELSE 'general'
  END
WHERE type = 'gift_card';

-- Insert popular gift card brands
INSERT INTO public.rewards (name, type, description, status, brand_category, is_flexible_amount, min_amount, max_amount, conversion_rate, cost, image_url) VALUES
('Uber Gift Card', 'gift_card', 'Get rides and food delivery with Uber', 'active', 'transportation', true, 5.00, 500.00, 100.00, 0, 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InViZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDAwMDAwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMzMzMzMzIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIHJ4PSIxNSIgZmlsbD0idXJsKCN1YmVyR3JhZCkiLz48dGV4dCB4PSIyMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZm9udC13ZWlnaHQ9ImJvbGQiPlViZXI8L3RleHQ+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNDQ0NDQ0MiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+R2lmdCBDYXJkPC90ZXh0Pjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2Ij4kNSAtICQ1MDA8L3RleHQ+PC9zdmc+'),
('DoorDash Gift Card', 'gift_card', 'Food delivery from your favorite restaurants', 'active', 'food_drink', true, 5.00, 500.00, 100.00, 0, 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImRkR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0ZGNDUwMCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I0VFMzMwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiByeD0iMTUiIGZpbGw9InVybCgjZGRHcmFkKSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCI+RG9vckRhc2g8L3RleHQ+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkdpZnQgQ2FyZDwvdGV4dD48dGV4dCB4PSIyMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+JDUgLSAkNTAwPC90ZXh0Pjwvc3ZnPg=='),
('Amazon Gift Card', 'gift_card', 'Shop millions of items on Amazon', 'active', 'retail', true, 5.00, 500.00, 100.00, 0, 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImFtYXpvbkdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkEwMDAiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRjg4MDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgcng9IjE1IiBmaWxsPSJ1cmwoI2FtYXpvbkdyYWQpIi8+PHRleHQgeD0iMjAwIiB5PSIxMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIj5BbWF6b248L3RleHQ+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkdpZnQgQ2FyZDwvdGV4dD48dGV4dCB4PSIyMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+JDUgLSAkNTAwPC90ZXh0Pjwvc3ZnPg=='),
('Target Gift Card', 'gift_card', 'Shop at Target stores and online', 'active', 'retail', true, 5.00, 500.00, 100.00, 0, 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InRhcmdldEdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNDQzAwMDAiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNBQTAwMDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgcng9IjE1IiBmaWxsPSJ1cmwoI3RhcmdldEdyYWQpIi8+PHRleHQgeD0iMjAwIiB5PSIxMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIj5UYXJnZXQ8L3RleHQ+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkdpZnQgQ2FyZDwvdGV4dD48dGV4dCB4PSIyMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+JDUgLSAkNTAwPC90ZXh0Pjwvc3ZnPg=='),
('Walmart Gift Card', 'gift_card', 'Shop at Walmart stores and online', 'active', 'retail', true, 5.00, 500.00, 100.00, 0, 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9IndhbG1hcnRHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA0Qzk2Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDAzNzc0Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIHJ4PSIxNSIgZmlsbD0idXJsKCN3YWxtYXJ0R3JhZCkiLz48dGV4dCB4PSIyMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZm9udC13ZWlnaHQ9ImJvbGQiPldBTE1BUlQ8L3RleHQ+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkdpZnQgQ2FyZDwvdGV4dD48dGV4dCB4PSIyMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+JDUgLSAkNTAwPC90ZXh0Pjwvc3ZnPg==');

-- Update redemption function to handle flexible amounts
CREATE OR REPLACE FUNCTION redeem_flexible_reward(
  p_user_id UUID,
  p_reward_id UUID,
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_points INTEGER;
  v_reward RECORD;
  v_points_needed INTEGER;
  v_redemption_id UUID;
BEGIN
  -- Get user's current points
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_user_points
  FROM portfolio_user_points 
  WHERE user_id = p_user_id;
  
  -- Get reward details
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Validate amount is within bounds
  IF p_amount < v_reward.min_amount OR p_amount > v_reward.max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 
      format('Amount must be between $%.2f and $%.2f', v_reward.min_amount, v_reward.max_amount));
  END IF;
  
  -- Calculate points needed
  v_points_needed := (p_amount * v_reward.conversion_rate)::INTEGER;
  
  -- Check if user has enough points
  IF v_user_points < v_points_needed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- Create redemption record
  INSERT INTO redemptions (user_id, reward_id, points_used, status, redeemed_at, notes)
  VALUES (p_user_id, p_reward_id, v_points_needed, 'pending', NOW(), 
          format('$%.2f %s gift card', p_amount, v_reward.name))
  RETURNING id INTO v_redemption_id;
  
  -- Deduct points by inserting negative entry
  INSERT INTO portfolio_user_points (user_id, portfolio_id, points_awarded, event_type, metadata)
  VALUES (p_user_id, NULL, -v_points_needed, 'reward_redemption', 
          jsonb_build_object('redemption_id', v_redemption_id, 'amount', p_amount));
  
  -- Return success with new balance
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_user_points - v_points_needed,
    'redemption_id', v_redemption_id,
    'amount', p_amount,
    'points_used', v_points_needed
  );
END;
$$;