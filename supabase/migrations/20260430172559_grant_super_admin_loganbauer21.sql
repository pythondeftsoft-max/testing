-- Grant super_admin to loganbauer21@gmail.com (was missing system_admins row,
-- which is now required by edge functions like enrich-pha-website).
INSERT INTO public.system_admins (user_id, role_name, is_active, created_at)
SELECT '2deadd83-d426-46fa-86a6-360203323866'::uuid, 'super_admin', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_admins
  WHERE user_id = '2deadd83-d426-46fa-86a6-360203323866'::uuid
    AND role_name = 'super_admin'
);

UPDATE public.system_admins
SET is_active = true
WHERE user_id = '2deadd83-d426-46fa-86a6-360203323866'::uuid
  AND role_name = 'super_admin'
  AND is_active = false;
