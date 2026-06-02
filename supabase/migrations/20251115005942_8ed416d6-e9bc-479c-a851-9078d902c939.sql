-- Create implementation_tasks table
CREATE TABLE implementation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Feature',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Backlog',
  estimated_time TEXT,
  actual_time TEXT,
  source TEXT NOT NULL DEFAULT 'Manual',
  ai_reasoning TEXT,
  assigned_to UUID,
  order_index INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create ai_implementation_suggestions table
CREATE TABLE ai_implementation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_batch_id UUID NOT NULL,
  suggested_task JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  context_analysis JSONB,
  accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE implementation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_implementation_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for implementation_tasks (allow authenticated users, frontend will check admin)
CREATE POLICY "Allow authenticated users to view implementation tasks"
ON implementation_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert implementation tasks"
ON implementation_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update implementation tasks"
ON implementation_tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete implementation tasks"
ON implementation_tasks FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for ai_implementation_suggestions
CREATE POLICY "Allow authenticated users to view AI suggestions"
ON ai_implementation_suggestions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage AI suggestions"
ON ai_implementation_suggestions FOR ALL
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_implementation_tasks_status ON implementation_tasks(status);
CREATE INDEX idx_implementation_tasks_priority ON implementation_tasks(priority);
CREATE INDEX idx_implementation_tasks_assigned_to ON implementation_tasks(assigned_to);
CREATE INDEX idx_implementation_tasks_created_by ON implementation_tasks(created_by);
CREATE INDEX idx_implementation_tasks_order_index ON implementation_tasks(order_index);
CREATE INDEX idx_ai_suggestions_batch_id ON ai_implementation_suggestions(suggestion_batch_id);
CREATE INDEX idx_ai_suggestions_accepted ON ai_implementation_suggestions(accepted);

-- Create trigger for updated_at
CREATE TRIGGER update_implementation_tasks_updated_at
BEFORE UPDATE ON implementation_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();