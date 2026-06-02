-- Add composite unique constraint for session upsert to work correctly
-- This allows onConflict: 'user_id,session_token' to function without error 42P10
ALTER TABLE user_sessions 
ADD CONSTRAINT user_sessions_user_id_session_token_key 
UNIQUE (user_id, session_token);