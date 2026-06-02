-- Enable realtime for the email_queue table
ALTER TABLE public.email_queue REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_queue;