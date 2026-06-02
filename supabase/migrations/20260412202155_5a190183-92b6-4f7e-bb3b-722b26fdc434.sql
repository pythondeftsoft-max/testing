
-- Add enterprise columns to voucher_applications
ALTER TABLE public.voucher_applications 
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
  ADD COLUMN IF NOT EXISTS preference_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preference_categories JSONB DEFAULT '[]'::jsonb;

-- Add expiration tracking to agency_documents
ALTER TABLE public.agency_documents
  ADD COLUMN IF NOT EXISTS expiration_date DATE,
  ADD COLUMN IF NOT EXISTS document_category TEXT;

-- Index for expiration queries
CREATE INDEX IF NOT EXISTS idx_agency_documents_expiration 
  ON public.agency_documents (expiration_date) 
  WHERE expiration_date IS NOT NULL;

-- Index for waitlist sorting
CREATE INDEX IF NOT EXISTS idx_voucher_applications_waitlist 
  ON public.voucher_applications (waitlist_position, preference_points);
