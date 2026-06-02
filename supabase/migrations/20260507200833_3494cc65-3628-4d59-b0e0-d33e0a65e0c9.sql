ALTER TABLE public.agency_landlords
  ADD COLUMN IF NOT EXISTS preferred_disburse_rail text;

ALTER TABLE public.agency_pic_submissions
  ADD COLUMN IF NOT EXISTS transmit_method text DEFAULT 'manual_upload',
  ADD COLUMN IF NOT EXISTS transmit_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS hud_response_file_url text,
  ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.agency_pic_record_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.agency_pic_submissions(id) ON DELETE CASCADE,
  record_id uuid,
  error_code text,
  error_message text,
  fixed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pic_record_errors_submission ON public.agency_pic_record_errors(submission_id);
CREATE INDEX IF NOT EXISTS idx_pic_record_errors_open ON public.agency_pic_record_errors(submission_id) WHERE fixed_at IS NULL;

ALTER TABLE public.agency_pic_record_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view PIC errors"
  ON public.agency_pic_record_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_pic_submissions s
      JOIN public.agency_staff st ON st.agency_id = s.agency_id
      WHERE s.id = submission_id
        AND st.user_id = auth.uid()
        AND st.is_active = true
    )
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency admins can manage PIC errors"
  ON public.agency_pic_record_errors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_pic_submissions s
      JOIN public.agency_staff st ON st.agency_id = s.agency_id
      WHERE s.id = submission_id
        AND st.user_id = auth.uid()
        AND st.is_active = true
        AND st.role IN ('agency_admin','executive_director','finance')
    )
    OR public.is_admin(auth.uid())
  );

ALTER TABLE public.hap_batch_items
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_reason text,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS reissued_in_item_id uuid REFERENCES public.hap_batch_items(id);

CREATE INDEX IF NOT EXISTS idx_hap_batch_items_voided ON public.hap_batch_items(batch_id) WHERE voided_at IS NOT NULL;