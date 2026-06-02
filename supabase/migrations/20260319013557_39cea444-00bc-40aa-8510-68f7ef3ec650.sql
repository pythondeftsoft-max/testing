INSERT INTO match_compute_queue (entity_type, entity_id)
VALUES 
  ('property', '2d2a3671-c20c-4145-88ca-51899a98cf81'),
  ('property', 'ccb41d2a-a94a-4d41-b73d-1d575d89428e')
ON CONFLICT (entity_type, entity_id) DO UPDATE 
SET requested_at = now(), processing_started_at = NULL, attempts = 0