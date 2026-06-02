INSERT INTO public.user_roles (user_id, role)
VALUES ('2deadd83-d426-46fa-86a6-360203323866', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;