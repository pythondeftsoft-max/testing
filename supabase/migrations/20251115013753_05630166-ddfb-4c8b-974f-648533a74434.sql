-- Add previous_status column for undo functionality
ALTER TABLE implementation_tasks 
ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_implementation_tasks_status ON implementation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_implementation_tasks_priority ON implementation_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_implementation_tasks_category ON implementation_tasks(category);