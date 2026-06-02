
-- Create property_import_sessions table to track bulk import operations
CREATE TABLE public.property_import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  import_data JSONB DEFAULT '{}',
  validation_errors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create property_import_results table to track individual property import results
CREATE TABLE public.property_import_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_session_id UUID NOT NULL REFERENCES public.property_import_sessions(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  error_details JSONB DEFAULT '{}',
  original_data JSONB NOT NULL DEFAULT '{}',
  processed_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create property_import_duplicates table to track potential duplicate properties
CREATE TABLE public.property_import_duplicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_session_id UUID NOT NULL REFERENCES public.property_import_sessions(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  existing_property_id UUID NOT NULL REFERENCES public.properties(id),
  similarity_score NUMERIC NOT NULL DEFAULT 0,
  duplicate_reasons JSONB DEFAULT '[]',
  user_decision TEXT CHECK (user_decision IN ('merge', 'skip', 'create_new', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for property_import_sessions
ALTER TABLE public.property_import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own import sessions" 
  ON public.property_import_sessions 
  FOR ALL 
  USING (user_id = auth.uid());

-- Add RLS policies for property_import_results
ALTER TABLE public.property_import_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import results" 
  ON public.property_import_results 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.property_import_sessions 
    WHERE id = property_import_results.import_session_id 
    AND user_id = auth.uid()
  ));

-- Add RLS policies for property_import_duplicates
ALTER TABLE public.property_import_duplicates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own import duplicates" 
  ON public.property_import_duplicates 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.property_import_sessions 
    WHERE id = property_import_duplicates.import_session_id 
    AND user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_property_import_sessions_user_id ON public.property_import_sessions(user_id);
CREATE INDEX idx_property_import_sessions_status ON public.property_import_sessions(status);
CREATE INDEX idx_property_import_results_session_id ON public.property_import_results(import_session_id);
CREATE INDEX idx_property_import_results_status ON public.property_import_results(status);
CREATE INDEX idx_property_import_duplicates_session_id ON public.property_import_duplicates(import_session_id);
CREATE INDEX idx_property_import_duplicates_existing_property ON public.property_import_duplicates(existing_property_id);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_property_import_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_import_sessions_updated_at
  BEFORE UPDATE ON public.property_import_sessions
  FOR EACH ROW EXECUTE FUNCTION update_property_import_updated_at();

CREATE TRIGGER update_property_import_results_updated_at
  BEFORE UPDATE ON public.property_import_results
  FOR EACH ROW EXECUTE FUNCTION update_property_import_updated_at();

CREATE TRIGGER update_property_import_duplicates_updated_at
  BEFORE UPDATE ON public.property_import_duplicates
  FOR EACH ROW EXECUTE FUNCTION update_property_import_updated_at();
