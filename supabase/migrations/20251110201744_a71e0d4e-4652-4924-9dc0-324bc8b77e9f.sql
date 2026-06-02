-- Assign orphaned properties to default portfolio
-- This fixes properties that have portfolio_id = NULL, making them invisible in portfolio views

UPDATE properties
SET portfolio_id = '7980b8bf-c0e0-483d-9262-8c3fa8661603' -- "This is my own Portoflio"
WHERE portfolio_id IS NULL
  AND deleted_at IS NULL
  AND owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede';

-- Add a comment explaining the fix
COMMENT ON COLUMN properties.portfolio_id IS 'Portfolio ID - should never be NULL for active properties';