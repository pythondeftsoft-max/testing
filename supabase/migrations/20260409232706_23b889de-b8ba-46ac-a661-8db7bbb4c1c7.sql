
-- Create enum for move-in task types
CREATE TYPE public.move_in_task_type AS ENUM (
  'keys_issued',
  'utilities_transferred',
  'inspection_passed',
  'hap_contract_executed',
  'lease_signed',
  'security_deposit',
  'other'
);

-- Create pending_move_in_tasks table
CREATE TABLE public.pending_move_in_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.tenant_leases(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  task_type public.move_in_task_type NOT NULL,
  label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lease_id, task_type)
);

-- Enable RLS
ALTER TABLE public.pending_move_in_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: Agency staff can view tasks for their agency
CREATE POLICY "Agency staff can view move-in tasks"
  ON public.pending_move_in_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = pending_move_in_tasks.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
    )
  );

-- RLS: Agency staff can insert tasks
CREATE POLICY "Agency staff can create move-in tasks"
  ON public.pending_move_in_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = pending_move_in_tasks.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
    )
  );

-- RLS: Agency staff can update tasks
CREATE POLICY "Agency staff can update move-in tasks"
  ON public.pending_move_in_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = pending_move_in_tasks.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
    )
  );

-- RLS: Agency staff can delete tasks
CREATE POLICY "Agency staff can delete move-in tasks"
  ON public.pending_move_in_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = pending_move_in_tasks.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
    )
  );

-- Indexes
CREATE INDEX idx_pending_move_in_tasks_lease ON public.pending_move_in_tasks(lease_id);
CREATE INDEX idx_pending_move_in_tasks_agency ON public.pending_move_in_tasks(agency_id);

-- Updated_at trigger
CREATE TRIGGER update_pending_move_in_tasks_updated_at
  BEFORE UPDATE ON public.pending_move_in_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
