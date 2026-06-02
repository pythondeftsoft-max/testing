-- Add columns for notification snoozing and archiving
ALTER TABLE public.notifications 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN snoozed_until TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX idx_notifications_user_archived ON public.notifications (user_id, archived_at);
CREATE INDEX idx_notifications_user_snoozed ON public.notifications (user_id, snoozed_until);
CREATE INDEX idx_notifications_user_type ON public.notifications (user_id, type);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_notifications_updated_at();