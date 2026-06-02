-- Add due_date and task_id fields to maintenance_requests table
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS task_id TEXT;

-- Create sequence for task IDs starting from 36000
CREATE SEQUENCE IF NOT EXISTS maintenance_task_id_seq START 36000;

-- Create function to generate task ID
CREATE OR REPLACE FUNCTION generate_task_id()
RETURNS TEXT AS $$
BEGIN
  RETURN nextval('maintenance_task_id_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate task_id on insert
CREATE OR REPLACE FUNCTION set_maintenance_task_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NULL OR NEW.task_id = '' THEN
    NEW.task_id := generate_task_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_maintenance_task_id ON public.maintenance_requests;
CREATE TRIGGER trigger_set_maintenance_task_id
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_maintenance_task_id();

-- Update existing records to have task_ids (only those without task_id)
UPDATE public.maintenance_requests 
SET task_id = generate_task_id()
WHERE task_id IS NULL OR task_id = '';

-- Set default due dates for existing open requests (7 days from submitted date)
UPDATE public.maintenance_requests 
SET due_date = (submitted_date + INTERVAL '7 days')::DATE
WHERE due_date IS NULL 
  AND status IN ('pending', 'in_progress')
  AND submitted_date IS NOT NULL;