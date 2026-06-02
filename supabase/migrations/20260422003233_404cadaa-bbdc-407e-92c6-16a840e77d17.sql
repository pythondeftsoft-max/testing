-- Add caseworker_supervisor role to agency_role enum (additive, non-breaking)
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'caseworker_supervisor';