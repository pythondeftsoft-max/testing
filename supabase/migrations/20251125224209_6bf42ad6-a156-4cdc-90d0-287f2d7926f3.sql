-- Add 'lease_signed' to application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'lease_signed';