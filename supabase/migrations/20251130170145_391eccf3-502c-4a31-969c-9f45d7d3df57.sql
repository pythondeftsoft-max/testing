-- Add the missing foreign key from marketplace_applications.user_id to profiles.id
ALTER TABLE public.marketplace_applications 
ADD CONSTRAINT marketplace_applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Delete older duplicate placement agreements for 160 East Walnut, keeping only the most recent
DELETE FROM property_documents
WHERE property_id = '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a'
  AND document_type = 'placement_agreement'
  AND id != 'b0e76094-e4e9-4b6a-9c13-1f86d1da59fc';