-- Fix property status constraint to allow 'draft' status
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('available', 'occupied', 'maintenance', 'draft', 'deactivated', 'deleted'));

-- Add missing property types to enum
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'duplex';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'triplex';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'fourplex';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'mobile_home';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'manufactured_home';

-- Ensure properties table has all needed fields for import
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS property_name TEXT,
  ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES property_import_sessions(id);

-- Update property_units table to ensure it can handle import data
ALTER TABLE public.property_units 
  ADD COLUMN IF NOT EXISTS amenities TEXT,
  ADD COLUMN IF NOT EXISTS lease_terms TEXT,
  ADD COLUMN IF NOT EXISTS availability_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;