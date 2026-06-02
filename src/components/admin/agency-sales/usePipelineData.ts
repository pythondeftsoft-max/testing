import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// 10-stage agency sales lifecycle (+ Lost / Dormant side rail):
// Prospect → Qualified → Demo → Procurement Path → Trial → Proposal → Contract → Signed → Onboarding → Live
// Legacy DB statuses (engaged, contacted, negotiation, agreement) are collapsed on read.
export type PipelineStage =
  | 'prospect'
  | 'qualified'
  | 'engaged'         // legacy alias → maps to qualified on read
  | 'demo'
  | 'procurement'     // procurement path identified
  | 'trial'           // free trial / paid pilot in flight
  | 'proposal'
  | 'negotiation'     // legacy alias → maps to proposal
  | 'contract'        // redlines / DPA / legal / board
  | 'agreement'       // legacy alias → maps to contract
  | 'signed'
  | 'onboarding'
  | 'live'
  | 'lost'
  | 'dormant';

export type DealSize = 'small' | 'mid' | 'large';

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'demo', label: 'Demo' },
  { id: 'procurement', label: 'Procurement Path' },
  { id: 'trial', label: 'Trial / Pilot' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'contract', label: 'Contract' },
  { id: 'signed', label: 'Signed' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'live', label: 'Live' },
  { id: 'dormant', label: 'Dormant' },
  { id: 'lost', label: 'Lost' },
];

// Neutral wording — these are reminders for the human, not auto-triggers.
export const STAGE_NEXT_ACTION: Record<PipelineStage, string> = {
  prospect: 'Reach out to decision-maker',
  qualified: 'Book discovery / demo call',
  engaged: 'Book discovery / demo call',
  demo: 'Log demo recap',
  procurement: 'Confirm buying path with procurement',
  trial: 'Check in on trial usage',
  proposal: 'Confirm proposal received',
  negotiation: 'Confirm proposal received',
  contract: 'Track redlines / board approval',
  agreement: 'Track redlines / board approval',
  signed: 'Schedule kickoff',
  onboarding: 'Drive data load + staff invites',
  live: '30-day check-in',
  lost: 'Set revisit date',
  dormant: 'Set revisit date',
};

// SLA defaults (small PHA). Use slaFor() to scale by deal size.
const BASE_SLA: Partial<Record<PipelineStage, number>> = {
  prospect: 14,
  qualified: 10,
  engaged: 10,
  demo: 5,
  procurement: 30,
  trial: 30,
  proposal: 14,
  negotiation: 14,
  contract: 21,
  agreement: 21,
  signed: 7,
  onboarding: 30,
};

// =====================================================================
// Stage definitions — drives the AdvanceStageDialog form fields.
// =====================================================================

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'url'
  | 'number' | 'currency' | 'date' | 'select' | 'multiselect' | 'boolean';

export interface StageField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
  /** Optional predicate — render this field only when it returns true. */
  showWhen?: (fields: Record<string, any>) => boolean;
  /** Default value applied when the field first mounts. */
  defaultValue?: any;
}

export interface StageDefinition {
  id: PipelineStage;
  label: string;
  definition: string;
  required: StageField[];
  optional: StageField[];
}

const URGENCY_OPTS = [
  { value: 'now', label: 'Now (this month)' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'next_fy', label: 'Next fiscal year' },
  { value: 'exploring', label: 'Just exploring' },
];

const PROCUREMENT_OPTS = [
  { value: 'sole_source', label: 'Sole source' },
  { value: 'state_piggyback', label: 'State piggyback' },
  { value: 'coop', label: 'Co-op (HGAC, Sourcewell, etc.)' },
  { value: 'rfp', label: 'RFP' },
  { value: 'micro_purchase', label: 'Micro-purchase (under threshold)' },
  { value: 'unknown', label: 'Unknown' },
];

const PRICING_MODEL_OPTS = [
  { value: 'per_voucher', label: 'Per voucher' },
  { value: 'flat_annual', label: 'Flat annual' },
  { value: 'tiered', label: 'Tiered' },
  { value: 'hybrid', label: 'Hybrid' },
];

const BILLING_FREQ_OPTS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one_time', label: 'One-time' },
];

const LOST_REASON_OPTS = [
  { value: 'price', label: 'Price' },
  { value: 'timing', label: 'Timing' },
  { value: 'competitor', label: 'Chose competitor' },
  { value: 'no_budget', label: 'No budget' },
  { value: 'no_buyin', label: 'No decision-maker buy-in' },
  { value: 'silent', label: 'Went silent' },
  { value: 'other', label: 'Other' },
];

export const STAGE_DEFINITIONS: Partial<Record<PipelineStage, StageDefinition>> = {
  prospect: {
    id: 'prospect', label: 'Prospect',
    definition: 'PHA is in our list. No two-way contact yet.',
    required: [],
    optional: [
      { key: 'waitlist_status', label: 'Waitlist status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'unknown', label: 'Unknown' },
      ]},
      { key: 'waitlist_size', label: 'Waitlist size (if known)', type: 'number' },
      { key: 'source', label: 'Source', type: 'select', options: [
        { value: 'hud_import', label: 'HUD import' }, { value: 'referral', label: 'Referral' },
        { value: 'inbound', label: 'Inbound' }, { value: 'event', label: 'Event' }, { value: 'other', label: 'Other' },
      ]},
    ],
  },
  qualified: {
    id: 'qualified', label: 'Qualified',
    definition: 'A real human at the PHA has responded. Capture who you actually talked to — and the decision-maker if you know who that is.',
    required: [
      { key: 'responder_name', label: 'Responder name', type: 'text', helpText: 'The person who actually replied to you.' },
      { key: 'responder_email', label: 'Responder email', type: 'email' },
      { key: 'responder_is_dm', label: 'Responder is the decision-maker?', type: 'boolean', defaultValue: true },
      { key: 'first_reply_date', label: 'First reply date', type: 'date' },
      { key: 'channel', label: 'Channel', type: 'select', options: [
        { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' },
        { value: 'event', label: 'Event' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'other', label: 'Other' },
      ]},
    ],
    optional: [
      { key: 'responder_title', label: 'Responder title', type: 'text' },
      { key: 'responder_phone', label: 'Responder phone', type: 'phone' },
      { key: 'responder_relationship', label: 'Responder relationship to DM', type: 'select',
        showWhen: (f) => f.responder_is_dm === false,
        options: [
          { value: 'assistant', label: 'Assistant / EA' },
          { value: 'staff', label: 'Staff' },
          { value: 'procurement', label: 'Procurement' },
          { value: 'it', label: 'IT' },
          { value: 'finance', label: 'Finance' },
          { value: 'unknown', label: 'Unknown' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'decision_maker_name', label: 'Decision-maker name (if known)', type: 'text',
        showWhen: (f) => f.responder_is_dm === false },
      { key: 'decision_maker_email', label: 'Decision-maker email (if known)', type: 'email',
        showWhen: (f) => f.responder_is_dm === false },
      { key: 'decision_maker_title', label: 'Decision-maker title', type: 'text',
        showWhen: (f) => f.responder_is_dm === false },
      { key: 'current_software', label: 'Current software in use', type: 'text', placeholder: 'e.g., Yardi, Emphasys, paper' },
      { key: 'pain_points', label: 'Pain points', type: 'textarea' },
      { key: 'urgency', label: 'Urgency', type: 'select', options: URGENCY_OPTS },
    ],
  },
  demo: {
    id: 'demo', label: 'Demo',
    definition: 'Product shown OR deep discovery call done — they understand what we do.',
    required: [
      { key: 'demo_date', label: 'Demo / discovery date', type: 'date' },
      { key: 'attendees', label: 'Attendees (names + titles)', type: 'textarea' },
    ],
    optional: [
      { key: 'modules_shown', label: 'Modules shown', type: 'text', placeholder: 'HAP, Inspections, Waitlist…' },
      { key: 'top_pains', label: 'Top 3 pains they care about', type: 'textarea' },
      { key: 'competitors_mentioned', label: 'Competitors mentioned', type: 'text' },
      { key: 'recording_url', label: 'Recording URL', type: 'url' },
      { key: 'follow_up_commitments', label: 'Follow-up commitments', type: 'textarea' },
    ],
  },
  procurement: {
    id: 'procurement', label: 'Procurement Path',
    definition: 'We know HOW this PHA legally buys software.',
    required: [
      { key: 'procurement_path', label: 'Procurement path', type: 'select', options: PROCUREMENT_OPTS },
    ],
    optional: [
      { key: 'procurement_contact_name', label: 'Procurement contact name', type: 'text' },
      { key: 'procurement_contact_email', label: 'Procurement contact email', type: 'email' },
      { key: 'board_approval_required', label: 'Board approval required', type: 'boolean' },
      { key: 'expected_board_date', label: 'Expected board meeting date', type: 'date' },
      { key: 'fiscal_year_start_month', label: 'Fiscal year start month (1-12)', type: 'number' },
      { key: 'budget_source', label: 'Budget source', type: 'select', options: [
        { value: 'admin_fee', label: 'Admin fee' }, { value: 'hap_reserves', label: 'HAP reserves' },
        { value: 'grant', label: 'Grant' }, { value: 'mixed', label: 'Mixed' },
      ]},
      { key: 'dpa_required', label: 'DPA / security review required', type: 'boolean' },
      { key: 'estimated_contract_value', label: 'Estimated contract value', type: 'currency' },
    ],
  },
  trial: {
    id: 'trial', label: 'Trial / Pilot',
    definition: 'Free trial or paid pilot in flight. (Optional stage — skip if not running one.)',
    required: [
      { key: 'trial_type', label: 'Trial type', type: 'select', options: [
        { value: 'free_trial', label: 'Free trial' }, { value: 'paid_pilot', label: 'Paid pilot' },
      ]},
      { key: 'trial_start', label: 'Start date', type: 'date' },
      { key: 'trial_end', label: 'End date', type: 'date' },
      { key: 'success_criteria', label: 'Success criteria', type: 'textarea' },
    ],
    optional: [
      { key: 'trial_scope', label: 'Trial scope (modules)', type: 'text' },
      { key: 'trial_user_count', label: '# of users to invite', type: 'number' },
      { key: 'conversion_target_date', label: 'Conversion target date', type: 'date' },
      { key: 'paid_pilot_amount', label: 'Paid pilot amount', type: 'currency' },
    ],
  },
  proposal: {
    id: 'proposal', label: 'Proposal',
    definition: 'Formal written proposal sent.',
    required: [
      { key: 'proposal_sent_date', label: 'Date sent', type: 'date' },
      { key: 'proposal_amount', label: 'Proposal amount', type: 'currency' },
      { key: 'pricing_model', label: 'Pricing model', type: 'select', options: PRICING_MODEL_OPTS },
      { key: 'proposal_pdf_url', label: 'Proposal PDF URL', type: 'url' },
    ],
    optional: [
      { key: 'proposal_version', label: 'Version #', type: 'text' },
      { key: 'modules_included', label: 'Modules included', type: 'text' },
      { key: 'contract_term_months', label: 'Contract term (months)', type: 'number' },
      { key: 'recipients', label: 'Recipients', type: 'text' },
      { key: 'sent_via', label: 'Sent via', type: 'select', options: [
        { value: 'email', label: 'Email' }, { value: 'portal', label: 'Portal' },
        { value: 'in_person', label: 'In person' }, { value: 'mail', label: 'Mail' },
      ]},
      { key: 'expiration_date', label: 'Expiration date', type: 'date' },
    ],
  },
  contract: {
    id: 'contract', label: 'Contract',
    definition: 'Verbal go-ahead received. Now in legal / redline / board / DPA phase.',
    required: [
      { key: 'expected_signature_date', label: 'Expected signature date', type: 'date' },
    ],
    optional: [
      { key: 'contract_draft_url', label: 'Contract draft URL', type: 'url' },
      { key: 'redline_rounds', label: 'Redline rounds count', type: 'number' },
      { key: 'legal_contact', label: 'Legal contact', type: 'text' },
      { key: 'dpa_status', label: 'DPA status', type: 'select', options: [
        { value: 'not_started', label: 'Not started' }, { value: 'in_review', label: 'In review' }, { value: 'approved', label: 'Approved' },
      ]},
      { key: 'board_agenda_date', label: 'Board agenda date', type: 'date' },
      { key: 'blockers', label: 'Blockers', type: 'textarea' },
      { key: 'risk_level', label: 'Risk level', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'med', label: 'Medium' }, { value: 'high', label: 'High' },
      ]},
    ],
  },
  signed: {
    id: 'signed', label: 'Signed',
    definition: 'Fully executed contract on file. Not yet provisioned.',
    required: [
      { key: 'executed_contract_url', label: 'Executed contract PDF URL', type: 'url' },
      { key: 'signature_date', label: 'Signature date', type: 'date' },
      { key: 'effective_start_date', label: 'Effective start date', type: 'date' },
      { key: 'total_contract_value', label: 'Total contract value', type: 'currency' },
      { key: 'billing_frequency', label: 'Billing frequency', type: 'select', options: BILLING_FREQ_OPTS },
    ],
    optional: [
      { key: 'contract_end_date', label: 'Contract end date', type: 'date' },
      { key: 'billing_contact_name', label: 'Billing contact name', type: 'text' },
      { key: 'billing_contact_email', label: 'Billing contact email', type: 'email' },
      { key: 'ap_email', label: 'AP email', type: 'email' },
      { key: 'po_number', label: 'PO #', type: 'text' },
      { key: 'kickoff_date', label: 'Kickoff date scheduled', type: 'date' },
    ],
  },
  onboarding: {
    id: 'onboarding', label: 'Onboarding',
    definition: 'We are actively setting them up — data load, staff invites, white-label, docs.',
    required: [
      { key: 'kickoff_date', label: 'Kickoff date', type: 'date' },
      { key: 'primary_admin_name', label: 'Primary admin name', type: 'text' },
      { key: 'primary_admin_email', label: 'Primary admin email', type: 'email' },
    ],
    optional: [
      { key: 'data_load_source', label: 'Data load source', type: 'select', options: [
        { value: 'csv', label: 'CSV' }, { value: 'legacy_export', label: 'Legacy system export' },
        { value: 'fresh', label: 'Starting fresh' },
      ]},
      { key: 'staff_to_invite_count', label: 'Staff to invite (count)', type: 'number' },
      { key: 'staff_roles', label: 'Staff roles needed', type: 'text' },
      { key: 'white_label_needed', label: 'White-label config needed', type: 'boolean' },
      { key: 'doc_count', label: 'Docs to load (count)', type: 'number' },
      { key: 'target_go_live', label: 'Target go-live date', type: 'date' },
      { key: 'integrations', label: 'Integrations needed', type: 'text', placeholder: 'NACHA, Checkbook, Quo…' },
    ],
  },
  live: {
    id: 'live', label: 'Live',
    definition: 'Fully provisioned and in production use.',
    required: [
      { key: 'go_live_date', label: 'Go-live date', type: 'date' },
    ],
    optional: [
      { key: 'active_user_count', label: '# of active users', type: 'number' },
      { key: 'first_30_day_check_in', label: 'First 30-day check-in date', type: 'date' },
      { key: 'account_owner', label: 'Account owner', type: 'text' },
      { key: 'expansion_notes', label: 'Expansion notes', type: 'textarea' },
    ],
  },
  lost: {
    id: 'lost', label: 'Lost',
    definition: 'Deal closed lost.',
    required: [
      { key: 'lost_reason', label: 'Lost reason', type: 'select', options: LOST_REASON_OPTS },
    ],
    optional: [
      { key: 'lost_competitor', label: 'Competitor won', type: 'text' },
      { key: 'revisit_at', label: 'Revisit date', type: 'date' },
    ],
  },
  dormant: {
    id: 'dormant', label: 'Dormant',
    definition: 'Paused but revivable. Not lost.',
    required: [
      { key: 'dormant_reason', label: 'Reason paused', type: 'textarea' },
      { key: 'revisit_at', label: 'Revisit date', type: 'date' },
    ],
    optional: [],
  },
};

// Stage ordering for "is forward move?" check.
const STAGE_ORDER: PipelineStage[] = [
  'prospect', 'qualified', 'demo', 'procurement', 'trial',
  'proposal', 'contract', 'signed', 'onboarding', 'live',
];

export function isForwardMove(from: PipelineStage, to: PipelineStage): boolean {
  if (to === 'lost' || to === 'dormant') return false; // side rail — uses own form
  const fromIdx = STAGE_ORDER.indexOf(from === 'engaged' ? 'qualified'
    : from === 'negotiation' ? 'proposal'
    : from === 'agreement' ? 'contract'
    : from);
  const toIdx = STAGE_ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx > fromIdx;
}

const SIZE_MULT: Record<DealSize, number> = {
  small: 1,
  mid: 2,
  large: 4,
};

export function slaFor(stage: PipelineStage, dealSize?: DealSize | null): number | undefined {
  const base = BASE_SLA[stage];
  if (base == null) return undefined;
  const mult = dealSize ? SIZE_MULT[dealSize] : 1;
  return Math.round(base * mult);
}

// Back-compat export — defaults to small-PHA SLAs.
export const STAGE_SLA_DAYS: Partial<Record<PipelineStage, number>> = BASE_SLA;

export function isStuck(card: { stage: PipelineStage; days_in_stage?: number | null; deal_size?: DealSize | null }): boolean {
  const sla = slaFor(card.stage, card.deal_size);
  if (sla == null || card.days_in_stage == null) return false;
  return card.days_in_stage > sla;
}

export type QueueBucket = 'overdue' | 'today' | 'upcoming' | 'none';
export function queueBucket(nextActionAt?: string | null): QueueBucket {
  if (!nextActionAt) return 'none';
  const t = new Date(nextActionAt).getTime();
  if (Number.isNaN(t)) return 'none';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
  if (t < startOfToday) return 'overdue';
  if (t < endOfToday) return 'today';
  return 'upcoming';
}

export interface PipelineEnrichment {
  admin_fee_col_a: number | null;
  admin_fee_col_b: number | null;
  leased_units: number | null;
  is_mtw: boolean | null;
  estimated_admin_budget_annual: number | null;
  estimated_admin_budget_fallback: number | null;
  saas_wallet_low: number | null;
  saas_wallet_high: number | null;
  utilization_pct: number | null;
  ed_name: string | null;
  ed_email: string | null;
  ed_phone: string | null;
  detected_software: any;
  detected_payment_method: any;
}

export interface PipelineCard {
  source: 'lead' | 'prospect';
  id: string;
  agency_name: string;
  agency_state: string | null;
  voucher_count: number | null;
  stage: PipelineStage;
  deal_size?: DealSize | null;
  procurement_path?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  ed_name?: string | null;
  ed_email?: string | null;
  ed_phone?: string | null;
  website?: string | null;
  proposal_amount?: number | null;
  pricing_override?: any;
  next_action_at?: string | null;
  last_contacted_at?: string | null;
  last_stage_change_at?: string | null;
  days_in_stage?: number | null;
  owner_user_id?: string | null;
  housing_authority_id?: string | null;
  pha_code?: string | null;
  enrichment?: PipelineEnrichment | null;
  raw_status: string;
  conversion_step?: number;
  conversion_completed_at?: string | null;
}

// ===== Lead status mapping =====
export function leadStatusToStage(s: string): PipelineStage {
  switch (s) {
    case 'new': return 'prospect';
    case 'contacted':
    case 'qualified':
    case 'engaged': return 'qualified';
    case 'demo_scheduled': return 'demo';
    case 'trial': return 'trial';
    case 'proposal_sent': return 'proposal';
    case 'negotiation':
    case 'agreement': return 'contract';
    case 'procurement': return 'procurement';
    case 'won':
    case 'signed': return 'signed';
    case 'onboarding': return 'onboarding';
    case 'live': return 'live';
    case 'dormant': return 'dormant';
    case 'lost': return 'lost';
    default: return 'prospect';
  }
}

export function stageToLeadStatus(s: PipelineStage): string {
  switch (s) {
    case 'prospect': return 'new';
    case 'qualified':
    case 'engaged': return 'qualified';
    case 'demo': return 'demo_scheduled';
    case 'procurement': return 'procurement';
    case 'trial': return 'trial';
    case 'proposal':
    case 'negotiation': return 'proposal_sent';
    case 'contract':
    case 'agreement': return 'agreement';
    case 'signed': return 'signed';
    case 'onboarding': return 'onboarding';
    case 'live': return 'live';
    case 'dormant': return 'dormant';
    case 'lost': return 'lost';
  }
}

// ===== Prospect status mapping =====
export function prospectStatusToStage(s: string): PipelineStage {
  switch (s) {
    case 'cold':
    case 'researching':
      return 'prospect';
    case 'contacted':
    case 'qualified':
    case 'engaged':
      return 'qualified';
    case 'demo_scheduled':
      return 'demo';
    case 'procurement':
      return 'procurement';
    case 'trial':
      return 'trial';
    case 'negotiating':
    case 'proposal_sent':
      return 'proposal';
    case 'negotiation':
    case 'agreement':
      return 'contract';
    case 'signed':
      return 'signed';
    case 'onboarding':
      return 'onboarding';
    case 'live':
    case 'customer':
      return 'live';
    case 'not_a_fit':
    case 'lost':
      return 'lost';
    case 'dormant':
      return 'dormant';
    default:
      return 'prospect';
  }
}

export function stageToProspectStatus(s: PipelineStage): string {
  switch (s) {
    case 'prospect': return 'researching';
    case 'qualified':
    case 'engaged': return 'qualified';
    case 'demo': return 'demo_scheduled';
    case 'procurement': return 'procurement';
    case 'trial': return 'trial';
    case 'proposal':
    case 'negotiation': return 'negotiating';
    case 'contract':
    case 'agreement': return 'agreement';
    case 'signed': return 'signed';
    case 'onboarding': return 'onboarding';
    case 'live': return 'live';
    case 'dormant': return 'dormant';
    case 'lost': return 'not_a_fit';
  }
}

export function computeDealSize(vouchers?: number | null): DealSize | null {
  if (vouchers == null) return null;
  if (vouchers < 500) return 'small';
  if (vouchers < 5000) return 'mid';
  return 'large';
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function usePipelineCards() {
  return useQuery({
    queryKey: ['agency-sales', 'pipeline-cards', 'v6'],
    queryFn: async (): Promise<PipelineCard[]> => {
      const [leadsRes, prospectsRes] = await Promise.all([
        supabase
          .from('agency_leads')
          .select('id, agency_name, agency_state, voucher_count, status, contact_name, contact_email, contact_phone, proposal_amount, next_follow_up_at, last_stage_change_at, owner_user_id:assigned_to, conversion_step, conversion_completed_at, deal_size, procurement_path')
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase
          .from('pha_prospect_status')
          .select('id, status, next_action_at, housing_authority_id, last_contacted_at, last_stage_change_at, owner_user_id, pricing_override, conversion_step, conversion_completed_at, deal_size, procurement_path, housing_authorities:housing_authority_id (name, state, phone, email, website, pha_code, tenant_count, metadata)')
          .order('updated_at', { ascending: false })
          .limit(500),
      ]);

      if (leadsRes.error) console.warn('[pipeline] leads error', leadsRes.error);
      if (prospectsRes.error) console.warn('[pipeline] prospects error', prospectsRes.error);

      const phaCodes = Array.from(
        new Set(
          (prospectsRes.data || [])
            .map((p: any) => p.housing_authorities?.pha_code)
            .filter(Boolean)
        )
      );
      const enrichmentByCode = new Map<string, PipelineEnrichment>();
      if (phaCodes.length) {
        const { data: enrRows } = await (supabase as any)
          .from('pha_enrichment')
          .select(
            'pha_code, admin_fee_col_a, admin_fee_col_b, leased_units, is_mtw, estimated_admin_budget_annual, estimated_admin_budget_fallback, saas_wallet_low, saas_wallet_high, utilization_pct, ed_name, ed_email, ed_phone, detected_software, detected_payment_method'
          )
          .in('pha_code', phaCodes);
        (enrRows || []).forEach((r: any) => enrichmentByCode.set(r.pha_code, r as PipelineEnrichment));
      }

      const cards: PipelineCard[] = [];

      (leadsRes.data || []).forEach((l: any) => {
        const dealSize = (l.deal_size as DealSize | null) ?? computeDealSize(l.voucher_count);
        cards.push({
          source: 'lead',
          id: l.id,
          agency_name: l.agency_name,
          agency_state: l.agency_state,
          voucher_count: l.voucher_count,
          stage: leadStatusToStage(l.status),
          deal_size: dealSize,
          procurement_path: l.procurement_path ?? null,
          contact_name: l.contact_name,
          contact_email: l.contact_email,
          contact_phone: l.contact_phone ?? null,
          proposal_amount: l.proposal_amount,
          next_action_at: l.next_follow_up_at,
          last_stage_change_at: l.last_stage_change_at,
          days_in_stage: daysSince(l.last_stage_change_at),
          owner_user_id: l.owner_user_id ?? null,
          conversion_step: l.conversion_step ?? 0,
          conversion_completed_at: l.conversion_completed_at ?? null,
          raw_status: l.status,
        });
      });

      (prospectsRes.data || []).forEach((p: any) => {
        const ha = p.housing_authorities;
        const meta = (ha?.metadata ?? {}) as Record<string, any>;
        const enr = ha?.pha_code ? enrichmentByCode.get(ha.pha_code) ?? null : null;

        const voucherCount =
          enr?.leased_units ??
          (typeof meta.voucher_count === 'number' ? meta.voucher_count : null) ??
          (typeof meta.section8_units === 'number' ? meta.section8_units : null) ??
          (typeof meta.total_units === 'number' && meta.total_units > 0 ? meta.total_units : null) ??
          (ha?.tenant_count && ha.tenant_count > 0 ? ha.tenant_count : null) ??
          null;

        const edEmail = enr?.ed_email ?? meta.exec_dir_email ?? meta.contact_email ?? ha?.email ?? null;
        const edPhone = enr?.ed_phone ?? meta.exec_dir_phone ?? meta.contact_phone ?? ha?.phone ?? null;
        const edName = enr?.ed_name ?? meta.exec_dir_name ?? meta.contact_name ?? null;
        const website = meta.website ?? ha?.website ?? null;
        const dealSize = (p.deal_size as DealSize | null) ?? computeDealSize(voucherCount);

        cards.push({
          source: 'prospect',
          id: p.id,
          agency_name: ha?.name || 'Unknown PHA',
          agency_state: ha?.state || null,
          voucher_count: voucherCount,
          stage: prospectStatusToStage(p.status),
          deal_size: dealSize,
          procurement_path: p.procurement_path ?? null,
          contact_name: edName,
          contact_email: edEmail,
          contact_phone: edPhone,
          ed_name: edName,
          ed_email: edEmail,
          ed_phone: edPhone,
          website,
          pricing_override: p.pricing_override ?? null,
          next_action_at: p.next_action_at,
          last_contacted_at: p.last_contacted_at,
          last_stage_change_at: p.last_stage_change_at,
          days_in_stage: daysSince(p.last_stage_change_at),
          owner_user_id: p.owner_user_id ?? null,
          housing_authority_id: p.housing_authority_id,
          pha_code: ha?.pha_code ?? null,
          enrichment: enr,
          conversion_step: p.conversion_step ?? 0,
          conversion_completed_at: p.conversion_completed_at ?? null,
          raw_status: p.status,
        });
      });

      return cards;
    },
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
