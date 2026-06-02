-- Add DELETE RLS policy to allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Clean up old test notifications that keep reappearing
DELETE FROM public.notifications 
WHERE category = 'general' 
  AND type = 'info' 
  AND title = 'Application Credit Returned'
  AND created_at < '2025-10-22'::date;

-- Remove old maintenance notifications from September
DELETE FROM public.notifications 
WHERE category = 'Maintenance'
  AND created_at < '2025-10-01'::date;