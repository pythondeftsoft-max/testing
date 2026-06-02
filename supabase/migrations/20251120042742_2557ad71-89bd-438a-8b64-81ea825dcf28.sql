-- Update backdated events to be tracked as worker actions
UPDATE stage_change_events
SET changed_by_type = 'worker'
WHERE id IN (
  '2e126534-486c-4b4e-abdc-8331a5604255',  -- Tenant event: seeking → approved_awaiting
  '57d48a5f-6e65-4d85-a484-4b4353fc5acf'   -- Property event: available → lease_signed
);