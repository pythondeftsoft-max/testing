-- Add personal information fields to system_admin_invitations table
ALTER TABLE system_admin_invitations
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN phone TEXT;