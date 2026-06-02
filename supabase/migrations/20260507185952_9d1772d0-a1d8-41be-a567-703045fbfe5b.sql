
-- Reference table for ACH return codes
CREATE TABLE public.nacha_return_codes (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  retry_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nacha_return_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read return codes"
  ON public.nacha_return_codes FOR SELECT TO authenticated USING (true);

INSERT INTO public.nacha_return_codes (code, label, description, retry_eligible) VALUES
  ('R01','Insufficient Funds','Available balance is insufficient to cover the debit', true),
  ('R02','Account Closed','Previously active account has been closed', false),
  ('R03','No Account / Unable to Locate','Account number does not correspond to receiver', false),
  ('R04','Invalid Account Number','Account number structure is not valid', false),
  ('R05','Unauthorized Debit to Consumer','Debit to consumer account using corporate SEC code', false),
  ('R06','Returned per ODFI Request','ODFI requested return', false),
  ('R07','Authorization Revoked by Customer','Receiver revoked authorization', false),
  ('R08','Payment Stopped','Receiver placed stop payment', false),
  ('R09','Uncollected Funds','Sufficient ledger balance but uncollected funds', true),
  ('R10','Customer Advises Not Authorized','Receiver claims debit not authorized', false),
  ('R11','Check Truncation Entry Return','Check truncation entry being returned', false),
  ('R12','Account Sold to Another DFI','Account transferred to another institution', false),
  ('R13','Invalid ACH Routing Number','Routing number not on official list', false),
  ('R14','Account Holder Deceased','Representative payee deceased', false),
  ('R15','Beneficiary or Account Holder Deceased','Beneficiary or holder deceased', false),
  ('R16','Account Frozen / Legal Action','Account frozen by legal action', false),
  ('R17','File Record Edit Criteria','Field error caused rejection', false),
  ('R20','Non-Transaction Account','Account does not allow ACH transactions', false),
  ('R21','Invalid Company Identification','Invalid company identification number', false),
  ('R22','Invalid Individual ID Number','Invalid individual identification number', false),
  ('R23','Credit Entry Refused by Receiver','Receiver refused the credit entry', false),
  ('R24','Duplicate Entry','Duplicate of previous entry', false),
  ('R29','Corporate Customer Advises Not Authorized','Corporate receiver not authorized', false),
  ('R31','Permissible Return Entry','Permissible return entry', false),
  ('R33','Return of XCK Entry','Return of XCK (destroyed check) entry', false),
  ('R34','Limited Participation DFI','RDFI participation limited by federal regulator', false),
  ('R37','Source Document Presented for Payment','Source document also presented for payment', false),
  ('R38','Stop Payment on Source Document','Stop payment on the source document', false),
  ('R39','Improper Source Document','Improper source document', false),
  ('R51','Item Related to RCK Entry Ineligible','RCK entry ineligible', false);

-- Stamp batches with their generated payment artifacts
ALTER TABLE public.hap_payment_batches
  ADD COLUMN nacha_file_id uuid REFERENCES public.agency_nacha_files(id),
  ADD COLUMN ap_export_url text,
  ADD COLUMN ap_export_format text;

-- YTD landlord paid totals
CREATE OR REPLACE VIEW public.landlord_hap_paid_ytd AS
  SELECT landlord_id,
         agency_id,
         date_trunc('year', paid_at)::date AS tax_year,
         SUM(amount)::numeric AS total_paid,
         COUNT(*) AS payment_count
  FROM public.hap_disbursements
  WHERE status = 'paid' AND paid_at IS NOT NULL
  GROUP BY landlord_id, agency_id, date_trunc('year', paid_at);
