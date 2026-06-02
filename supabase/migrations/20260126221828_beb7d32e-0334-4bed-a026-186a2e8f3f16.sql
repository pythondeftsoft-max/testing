-- First, allow NULL values in encrypted_password for completed signups (security improvement)
ALTER TABLE pending_signups ALTER COLUMN encrypted_password DROP NOT NULL;

-- Now clean up stuck signups that were already processed
UPDATE pending_signups 
SET status = 'completed', 
    completed_at = NOW(), 
    encrypted_password = NULL 
WHERE email IN ('lianalittle91@gmail.com', 'lashondabarrett49@gmail.com') 
  AND status = 'processing';