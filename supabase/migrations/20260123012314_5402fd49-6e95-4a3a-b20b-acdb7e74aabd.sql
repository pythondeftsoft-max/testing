-- Add tour completion tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_completed_landlord_tour boolean DEFAULT false;