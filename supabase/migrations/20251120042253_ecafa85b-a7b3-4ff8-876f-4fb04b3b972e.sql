-- Insert tenant stage change event (backdated)
INSERT INTO stage_change_events (
  entity_type,
  entity_id,
  from_stage,
  to_stage,
  changed_by_id,
  changed_by_type,
  is_forward_move,
  points_earned,
  created_at
) VALUES (
  'tenant',
  '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6',
  'seeking',
  'approved_awaiting',
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  'system',
  true,
  1,
  '2025-11-20 04:09:34+00'
);

-- Insert property stage change event (backdated)
INSERT INTO stage_change_events (
  entity_type,
  entity_id,
  from_stage,
  to_stage,
  changed_by_id,
  changed_by_type,
  is_forward_move,
  points_earned,
  created_at
) VALUES (
  'property',
  'f75e24eb-d428-4023-b7bd-609cc3a7b950',
  'available',
  'lease_signed',
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  'system',
  true,
  1,
  '2025-11-20 04:09:34+00'
);