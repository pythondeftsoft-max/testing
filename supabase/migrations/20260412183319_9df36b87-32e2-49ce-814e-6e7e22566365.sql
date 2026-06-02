
-- Create checklist_type enum
CREATE TYPE public.checklist_type AS ENUM ('move_in', 'move_out');

-- Create condition_rating enum
CREATE TYPE public.condition_rating AS ENUM ('good', 'fair', 'poor');

-- Create tenant_condition_checklists table
CREATE TABLE public.tenant_condition_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  checklist_type public.checklist_type NOT NULL,
  room_name TEXT NOT NULL,
  condition_rating public.condition_rating NOT NULL DEFAULT 'good',
  notes TEXT,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_condition_checklists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own checklists"
  ON public.tenant_condition_checklists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklists"
  ON public.tenant_condition_checklists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklists"
  ON public.tenant_condition_checklists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklists"
  ON public.tenant_condition_checklists FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_tenant_condition_checklists_updated_at
  BEFORE UPDATE ON public.tenant_condition_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('condition-photos', 'condition-photos', false);

-- Storage RLS policies
CREATE POLICY "Users can view their own condition photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'condition-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own condition photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'condition-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own condition photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'condition-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own condition photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'condition-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
