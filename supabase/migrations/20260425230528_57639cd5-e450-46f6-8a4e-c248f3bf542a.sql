-- Audit log for PM/Listing mode changes
CREATE TABLE public.account_mode_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_mode BOOLEAN NOT NULL,
  new_mode BOOLEAN NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_role TEXT NOT NULL DEFAULT 'self' CHECK (changed_by_role IN ('self', 'admin')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_mode_changes_user_id ON public.account_mode_changes(user_id);
CREATE INDEX idx_account_mode_changes_created_at ON public.account_mode_changes(created_at DESC);

ALTER TABLE public.account_mode_changes ENABLE ROW LEVEL SECURITY;

-- Users can view their own mode change history
CREATE POLICY "Users can view their own mode changes"
ON public.account_mode_changes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own self-initiated mode changes
CREATE POLICY "Users can log their own mode changes"
ON public.account_mode_changes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND changed_by = auth.uid()
  AND changed_by_role = 'self'
);

-- Admins can view all mode changes
CREATE POLICY "Admins can view all mode changes"
ON public.account_mode_changes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert mode changes for any user
CREATE POLICY "Admins can log mode changes for any user"
ON public.account_mode_changes
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND changed_by = auth.uid()
);