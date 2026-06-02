-- Add 'lease_sent' to application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'lease_sent';