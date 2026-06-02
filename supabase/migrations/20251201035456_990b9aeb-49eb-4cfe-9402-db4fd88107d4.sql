-- Fix property on_market status for 1360 scotch mountain road
-- Property has Unit 1 still available but was incorrectly marked as off-market

UPDATE properties 
SET on_market = true 
WHERE id = '60d95547-27f3-4dc8-8828-383c4f2c7e2b'
AND on_market = false;