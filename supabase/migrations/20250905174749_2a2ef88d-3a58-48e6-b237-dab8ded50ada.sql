
-- 1) Create table for audit-only vendor/owner payments tied to properties
CREATE TABLE public.vendor_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  portfolio_id UUID NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  vendor_id UUID NULL REFERENCES public.maintenance_vendors(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL DEFAULT 'vendor', -- 'vendor' | 'owner' | 'other'
  recipient_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL, -- e.g., 'ach','check','cash','card','zelle','other'
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference TEXT NULL, -- check #, ACH ref, etc.
  memo TEXT NULL,
  attachment_url TEXT NULL, -- optional receipt link for now
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Helpful indexes
CREATE INDEX vendor_payment_records_property_id_idx ON public.vendor_payment_records(property_id);
CREATE INDEX vendor_payment_records_landlord_id_idx ON public.vendor_payment_records(landlord_id);
CREATE INDEX vendor_payment_records_paid_at_idx ON public.vendor_payment_records(paid_at);

-- 3) Auto-update updated_at on change
CREATE TRIGGER set_vendor_payment_records_updated_at
BEFORE UPDATE ON public.vendor_payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 4) Enable Row Level Security
ALTER TABLE public.vendor_payment_records ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies
-- View: Landlords and portfolio members (viewer/editor/admin) can view records for their properties,
-- or the user who created the record can view it.
CREATE POLICY "View vendor payment records for owned/accessible properties"
ON public.vendor_payment_records
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = vendor_payment_records.property_id
      AND (
        p.owner_id = auth.uid()
        OR (
          p.portfolio_id IS NOT NULL
          AND has_portfolio_role(
            p.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]
          )
        )
      )
  )
);

-- Insert: record creator must be the current user, and they must be landlord or portfolio admin/editor for the property.
-- Also ensure landlord_id matches the property owner_id for data integrity.
CREATE POLICY "Insert vendor payment records for owned/managed properties"
ON public.vendor_payment_records
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = vendor_payment_records.property_id
      AND (
        p.owner_id = auth.uid()
        OR (
          p.portfolio_id IS NOT NULL
          AND has_portfolio_role(
            p.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
          )
        )
      )
  )
  AND landlord_id = (
    SELECT p2.owner_id FROM public.properties p2 WHERE p2.id = vendor_payment_records.property_id
  )
);

-- Update: property owner or portfolio admin/editor can update
CREATE POLICY "Update vendor payment records for owned/managed properties"
ON public.vendor_payment_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = vendor_payment_records.property_id
      AND (
        p.owner_id = auth.uid()
        OR (
          p.portfolio_id IS NOT NULL
          AND has_portfolio_role(
            p.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = vendor_payment_records.property_id
      AND (
        p.owner_id = auth.uid()
        OR (
          p.portfolio_id IS NOT NULL
          AND has_portfolio_role(
            p.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
          )
        )
      )
  )
);

-- Delete: property owner or portfolio admin/editor can delete
CREATE POLICY "Delete vendor payment records for owned/managed properties"
ON public.vendor_payment_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = vendor_payment_records.property_id
      AND (
        p.owner_id = auth.uid()
        OR (
          p.portfolio_id IS NOT NULL
          AND has_portfolio_role(
            p.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
          )
        )
      )
  )
);
