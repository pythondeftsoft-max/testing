
-- First, let's add proper RLS policy for property_import_results table
CREATE POLICY "Users can insert their own import results" 
  ON public.property_import_results 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_import_sessions pis 
      WHERE pis.id = property_import_results.import_session_id 
      AND pis.user_id = auth.uid()
    )
  );

-- Add a field to track import source and completion status
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS import_completed BOOLEAN DEFAULT true;

-- Create index for better performance when querying imported properties
CREATE INDEX IF NOT EXISTS idx_properties_import_source 
ON public.properties(import_source, import_completed) 
WHERE import_source IS NOT NULL;
