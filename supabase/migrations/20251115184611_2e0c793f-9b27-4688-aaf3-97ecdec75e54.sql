-- Delete the old combined free plan (no longer needed after splitting into role-specific plans)
DELETE FROM subscription_plans WHERE id = 'free';