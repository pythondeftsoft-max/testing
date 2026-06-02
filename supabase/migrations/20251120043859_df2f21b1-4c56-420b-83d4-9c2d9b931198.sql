-- Update metadata to include actor_role for the backdated events
-- This will make them display "Super Admin" badge instead of "System"
UPDATE stage_change_events
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{actor_role}',
  '"super_admin"'
)
WHERE id IN (
  '2e126534-486c-4b4e-abdc-8331a5604255',
  '57d48a5f-6e65-4d85-a484-4b4353fc5acf'
);