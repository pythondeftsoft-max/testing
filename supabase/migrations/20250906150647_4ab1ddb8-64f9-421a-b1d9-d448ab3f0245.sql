
-- 1) Table for account-level bank accounts linked via Plaid
CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Following best practice: reference public.profiles, not auth.users
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Plaid metadata (no access_token stored in this MVP)
  plaid_item_id TEXT,
  plaid_account_id TEXT NOT NULL,
  institution_name TEXT,
  account_name TEXT,
  mask TEXT,
  account_type TEXT,
  account_subtype TEXT,
  status TEXT NOT NULL DEFAULT 'linked', -- linked | disconnected | error
  is_default_for_payments BOOLEAN NOT NULL DEFAULT false,
  is_default_for_payouts BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avoid duplicate linking of the same Plaid account for the same user
CREATE UNIQUE INDEX user_bank_accounts_user_account_unique
ON public.user_bank_accounts (user_id, plaid_account_id);

CREATE INDEX user_bank_accounts_user_idx
ON public.user_bank_accounts (user_id);

-- 2) RLS
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own bank accounts
CREATE POLICY "Users can view their own bank accounts"
ON public.user_bank_accounts
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own bank accounts
CREATE POLICY "Users can create their own bank accounts"
ON public.user_bank_accounts
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own bank accounts
CREATE POLICY "Users can update their own bank accounts"
ON public.user_bank_accounts
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own bank accounts
CREATE POLICY "Users can delete their own bank accounts"
ON public.user_bank_accounts
FOR DELETE
USING (user_id = auth.uid());

-- 3) Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_user_bank_accounts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_user_bank_accounts_updated_at
BEFORE UPDATE ON public.user_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_user_bank_accounts_updated_at();
