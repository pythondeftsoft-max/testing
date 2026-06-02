-- Feature demos table for sales enablement video embeds
CREATE TABLE public.feature_demos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.feature_demos ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can view active demos
CREATE POLICY "Anyone can view active feature demos"
ON public.feature_demos
FOR SELECT
USING (is_active = true);

-- Admins can view all
CREATE POLICY "Admins can view all feature demos"
ON public.feature_demos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert
CREATE POLICY "Admins can insert feature demos"
ON public.feature_demos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update feature demos"
ON public.feature_demos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete feature demos"
ON public.feature_demos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_feature_demos_updated_at
BEFORE UPDATE ON public.feature_demos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_feature_demos_key_active ON public.feature_demos(feature_key) WHERE is_active = true;