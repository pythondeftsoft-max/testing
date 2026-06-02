
-- Part 1: Delete orphaned points_history records referencing deleted rent entries
DELETE FROM public.points_history
WHERE related_entity_id IN (
  '3cbf3f5a-c7dd-4206-a668-385a4b3e59ec',
  '952dd559-2bd9-45a7-be0e-ec7873d785dd',
  '023a11b6-a07b-4bfe-8cfc-0c508cb38531',
  '9c570939-fa03-4ff5-bc15-8a04f8bbfa6f'
)
AND related_entity_type = 'self_reported_rent';

-- Part 2: Recalculate points_balance_after running totals for ALL remaining records per user
WITH ordered AS (
  SELECT
    id,
    user_id,
    points_change,
    timestamp,
    SUM(points_change) OVER (
      PARTITION BY user_id
      ORDER BY timestamp, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS correct_balance
  FROM public.points_history
)
UPDATE public.points_history ph
SET points_balance_after = o.correct_balance
FROM ordered o
WHERE ph.id = o.id
  AND ph.points_balance_after IS DISTINCT FROM o.correct_balance;
