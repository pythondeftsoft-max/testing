-- 1. Create system_admins table for platform administrators
CREATE TABLE public.system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add index for performance
CREATE INDEX idx_system_admins_user_id ON public.system_admins(user_id);
CREATE INDEX idx_system_admins_is_active ON public.system_admins(is_active);

-- 3. Enable RLS
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (only system admins can manage)
CREATE POLICY "System admins can view system admins"
  ON public.system_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

CREATE POLICY "System admins can insert system admins"
  ON public.system_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

CREATE POLICY "System admins can update system admins"
  ON public.system_admins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

-- 5. Update is_admin() to check system_admins table
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins 
    WHERE system_admins.user_id = $1 
    AND is_active = true
  );
$$;

-- 6. Create function to get all system admins with profile info
CREATE OR REPLACE FUNCTION public.get_all_system_admins()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  granted_by uuid,
  granted_at timestamptz,
  notes text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    sa.id,
    sa.user_id,
    au.email AS user_email,
    p.first_name,
    p.last_name,
    sa.granted_by,
    sa.granted_at,
    sa.notes,
    sa.is_active,
    sa.created_at
  FROM public.system_admins sa
  LEFT JOIN public.profiles p ON p.id = sa.user_id
  LEFT JOIN auth.users au ON au.id = sa.user_id
  WHERE sa.is_active = true
  ORDER BY sa.created_at DESC;
$$;