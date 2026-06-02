-- Drop the existing foreign key to auth.users if it exists
ALTER TABLE territory_workers 
  DROP CONSTRAINT IF EXISTS territory_workers_worker_id_fkey;

-- Add new foreign key to profiles instead
-- This creates a direct path for PostgREST to join territory_workers -> profiles
ALTER TABLE territory_workers
  ADD CONSTRAINT territory_workers_worker_id_fkey
  FOREIGN KEY (worker_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';