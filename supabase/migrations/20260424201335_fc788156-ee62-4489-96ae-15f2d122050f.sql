-- Track whether a landlord has seen the simplified Listing-mode product tour.
-- Separate from has_completed_landlord_tour (which tracks the full PM tour) so
-- a user who toggles into PM mode later still gets that walkthrough once.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_landlord_listing_tour BOOLEAN NOT NULL DEFAULT false;