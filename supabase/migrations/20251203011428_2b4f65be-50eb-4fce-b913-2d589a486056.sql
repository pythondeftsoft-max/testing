-- Drop the current problematic policy that uses function call
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.maintenance_appointments;

-- Create a new policy with direct subquery check (more reliable in RLS context)
CREATE POLICY "Admins can view all appointments" ON public.maintenance_appointments
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.system_admins WHERE is_active = true)
);

-- Also fix the admin INSERT policy to use direct check
DROP POLICY IF EXISTS "Admins can create any appointment" ON public.maintenance_appointments;

CREATE POLICY "Admins can create any appointment" ON public.maintenance_appointments
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.system_admins WHERE is_active = true)
);

-- Add admin UPDATE policy with direct check
DROP POLICY IF EXISTS "Admins can update any appointment" ON public.maintenance_appointments;

CREATE POLICY "Admins can update any appointment" ON public.maintenance_appointments
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.system_admins WHERE is_active = true)
);

-- Add admin DELETE policy with direct check
DROP POLICY IF EXISTS "Admins can delete any appointment" ON public.maintenance_appointments;

CREATE POLICY "Admins can delete any appointment" ON public.maintenance_appointments
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.system_admins WHERE is_active = true)
);