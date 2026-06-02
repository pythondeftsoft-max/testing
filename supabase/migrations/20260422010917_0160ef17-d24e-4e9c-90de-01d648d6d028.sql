-- Add new role to agency_role enum
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'inspection_supervisor';

-- Add territory_zips column to agency_staff for inspector territory assignment
ALTER TABLE public.agency_staff ADD COLUMN IF NOT EXISTS territory_zips text[];