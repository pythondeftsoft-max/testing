-- Enable realtime for properties table
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;

-- Enable realtime for property_tenant_requests table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_tenant_requests;

-- Set replica identity to full to get complete row data
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.property_tenant_requests REPLICA IDENTITY FULL;