-- Add foreign key constraint from stage_change_events to profiles
-- This enables the Activity Tracker to join worker profile data
ALTER TABLE stage_change_events
ADD CONSTRAINT stage_change_events_changed_by_id_fkey 
FOREIGN KEY (changed_by_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;