
CREATE TABLE public.admin_qa_checklist_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

ALTER TABLE public.admin_qa_checklist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all qa checklist state"
ON public.admin_qa_checklist_state FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert their own qa checklist state"
ON public.admin_qa_checklist_state FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admins can update their own qa checklist state"
ON public.admin_qa_checklist_state FOR UPDATE
USING (public.is_admin(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admins can delete their own qa checklist state"
ON public.admin_qa_checklist_state FOR DELETE
USING (public.is_admin(auth.uid()) AND user_id = auth.uid());

CREATE INDEX idx_admin_qa_checklist_user ON public.admin_qa_checklist_state(user_id);
