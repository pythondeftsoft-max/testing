
-- Create saved_properties table for users to save/favorite properties
CREATE TABLE public.saved_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Add Row Level Security
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved properties" 
  ON public.saved_properties 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved properties" 
  ON public.saved_properties 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved properties" 
  ON public.saved_properties 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_saved_properties_user_id ON public.saved_properties(user_id);
CREATE INDEX idx_saved_properties_property_id ON public.saved_properties(property_id);
