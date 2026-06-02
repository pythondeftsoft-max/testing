-- Add subtasks column to implementation_tasks table
ALTER TABLE implementation_tasks 
ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN implementation_tasks.subtasks IS 'Array of subtasks with structure: [{"id": "uuid", "title": "text", "completed": boolean, "order": number}]';