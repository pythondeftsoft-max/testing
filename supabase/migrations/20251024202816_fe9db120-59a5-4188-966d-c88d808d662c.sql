-- Fix security warning: Set search_path for the trigger function
ALTER FUNCTION create_initial_application_message() SET search_path = public, pg_temp;