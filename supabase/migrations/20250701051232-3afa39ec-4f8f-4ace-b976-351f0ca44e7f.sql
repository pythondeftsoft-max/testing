
-- First, let's check if RLS is enabled and add policies for public access to properties
-- This will allow anonymous users to view available properties

-- Enable RLS on properties table if not already enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to view available properties
CREATE POLICY "Anyone can view available properties" 
  ON public.properties 
  FOR SELECT 
  USING (status = 'available');

-- Create policy to allow property owners to view their own properties
CREATE POLICY "Property owners can view their own properties" 
  ON public.properties 
  FOR SELECT 
  USING (auth.uid() = owner_id);

-- Create policy to allow property owners to insert their own properties
CREATE POLICY "Property owners can insert their own properties" 
  ON public.properties 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Create policy to allow property owners to update their own properties
CREATE POLICY "Property owners can update their own properties" 
  ON public.properties 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

-- Create policy to allow property owners to delete their own properties
CREATE POLICY "Property owners can delete their own properties" 
  ON public.properties 
  FOR DELETE 
  USING (auth.uid() = owner_id);
