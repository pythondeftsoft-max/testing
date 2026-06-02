-- Add attachment support to admin_messages table
ALTER TABLE public.admin_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Add index for faster queries on messages with attachments
CREATE INDEX IF NOT EXISTS idx_admin_messages_attachment_url 
ON public.admin_messages(attachment_url) 
WHERE attachment_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_messages.attachment_url IS 'Public URL of the attached file in storage';
COMMENT ON COLUMN public.admin_messages.attachment_name IS 'Original filename of the attachment';
COMMENT ON COLUMN public.admin_messages.attachment_type IS 'MIME type of the attachment';