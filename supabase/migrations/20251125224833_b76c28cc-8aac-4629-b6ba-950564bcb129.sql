-- Add 'housed' to application_status enum to allow landlord_send_lease function to reference it in NOT IN clauses
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'housed';