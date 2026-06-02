-- Add status column to agency_calendar_events for appointment request workflow
ALTER TABLE public.agency_calendar_events 
ADD COLUMN IF NOT EXISTS request_status text NOT NULL DEFAULT 'confirmed';

-- Add an index for filtering by status
CREATE INDEX IF NOT EXISTS idx_calendar_events_request_status 
ON public.agency_calendar_events(request_status);

COMMENT ON COLUMN public.agency_calendar_events.request_status IS 'Appointment status: requested, confirmed, cancelled';