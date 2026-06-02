-- Temporarily disable RLS to seed initial admin
ALTER TABLE public.system_admins DISABLE ROW LEVEL SECURITY;

-- Insert admin@openkey.com as initial system administrator
INSERT INTO public.system_admins (user_id, granted_by, notes)
VALUES (
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  'Admin Demo - Initial system administrator'
)
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;