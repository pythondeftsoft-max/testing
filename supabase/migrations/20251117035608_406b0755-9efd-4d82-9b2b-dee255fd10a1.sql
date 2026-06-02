-- Add foreign key constraint from system_admins to profiles
ALTER TABLE system_admins
ADD CONSTRAINT fk_system_admins_user_id 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_system_admins_user_id ON system_admins 
IS 'Links system admin records to their corresponding user profiles';