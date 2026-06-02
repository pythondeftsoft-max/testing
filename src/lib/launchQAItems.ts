export interface QAItem {
  key: string;
  label: string;
  hint?: string;
}

export interface QASection {
  key: string;
  title: string;
  items: QAItem[];
}

export const LAUNCH_QA_SECTIONS: QASection[] = [
  {
    key: 'setup',
    title: 'Setup',
    items: [
      { key: 'setup.seed', label: 'Seed 3 demo PHAs', hint: '/admin/qa/multi-agency → Seed' },
      { key: 'setup.rls', label: 'RLS isolation check passes', hint: '/admin/qa/multi-agency → Run RLS Checks' },
      { key: 'setup.readiness', label: 'Launch Readiness tile shows 6 gates on Alpha Overview' },
    ],
  },
  {
    key: 'landlord',
    title: 'Landlord flow',
    items: [
      { key: 'landlord.signup', label: 'Landlord signup works', hint: '/landlord-signup' },
      { key: 'landlord.unit', label: 'Register unit to a PHA' },
      { key: 'landlord.w9', label: 'Submit W-9' },
      { key: 'landlord.section8', label: 'Accept Section 8 enrollment invite' },
      { key: 'landlord.rfta', label: 'Submit RFTA' },
      { key: 'landlord.statements', label: 'View HAP history + monthly statement + 1099' },
      { key: 'landlord.notify', label: 'Receive disbursement notification (in-app + email)' },
    ],
  },
  {
    key: 'tenant',
    title: 'Tenant flow',
    items: [
      { key: 'tenant.apply', label: 'Apply to public waitlist', hint: '/apply/qa-alpha' },
      { key: 'tenant.pulled', label: 'Get pulled from waitlist (as caseworker)' },
      { key: 'tenant.voucher', label: 'Accept voucher' },
      { key: 'tenant.privacy', label: 'View tenant portion only (HAP privacy)' },
      { key: 'tenant.transparency', label: 'View repayment + special-claim transparency views' },
    ],
  },
  {
    key: 'caseworker',
    title: 'Caseworker flow',
    items: [
      { key: 'cw.rfta', label: 'Review pending RFTA' },
      { key: 'cw.rent', label: 'Run rent calculator (TTP/HAP)' },
      { key: 'cw.contract', label: 'Issue HAP contract' },
      { key: 'cw.inspection', label: 'Schedule + assign inspection' },
      { key: 'cw.recert', label: 'Process recertification with supervisor approval' },
    ],
  },
  {
    key: 'inspector',
    title: 'Inspector flow',
    items: [
      { key: 'insp.today', label: 'Open inspector today PWA', hint: '/inspector/today' },
      { key: 'insp.complete', label: 'Complete inspection with NSPIRE codes' },
      { key: 'insp.sync', label: 'Offline → online sync works' },
      { key: 'insp.hqs52', label: 'Generate HQS-52 PDF' },
    ],
  },
  {
    key: 'finance',
    title: 'Finance flow',
    items: [
      { key: 'fin.batch', label: 'Create HAP batch (draft → reviewed → approved)' },
      { key: 'fin.validate', label: 'validate-batch-pre-disburse blocks/warns correctly' },
      { key: 'fin.checkbook', label: 'Disburse via Checkbook (test mode)' },
      { key: 'fin.nacha', label: 'Generate NACHA file' },
      { key: 'fin.bulkvoid', label: 'Bulk void selected lines' },
      { key: 'fin.stop', label: 'Stop-payment a single line' },
      { key: 'fin.markpaid', label: 'Mark disbursements paid → landlord notified' },
    ],
  },
  {
    key: 'hud',
    title: 'HUD reporting',
    items: [
      { key: 'hud.50058', label: 'Generate HUD-50058 fixed-width' },
      { key: 'hud.vms', label: 'Generate VMS submission' },
      { key: 'hud.pic', label: 'Generate PIC submission file (download only)' },
      { key: 'hud.semap', label: 'Run SEMAP calc → designation badge appears' },
    ],
  },
  {
    key: 'compliance',
    title: 'Compliance',
    items: [
      { key: 'comp.claim', label: 'File special claim (52671)' },
      { key: 'comp.repay', label: 'Open repayment agreement → balance auto-decrements' },
      { key: 'comp.accom', label: 'Log reasonable accommodation → 14-day SLA tracks' },
      { key: 'comp.griev', label: 'Open grievance hearing' },
      { key: 'comp.kpi', label: 'Risk KPI cards appear on Overview when triggered' },
    ],
  },
  {
    key: 'porting',
    title: 'Porting',
    items: [
      { key: 'port.tenant', label: 'Port tenant Alpha → Beta' },
      { key: 'port.packet', label: 'Generate HUD-52665 packet' },
      { key: 'port.decision', label: 'Absorb / bill-back decision recorded' },
      { key: 'port.sla', label: 'SLA timer starts' },
    ],
  },
  {
    key: 'comms',
    title: 'Comms',
    items: [
      { key: 'comms.sms', label: 'SMS via Quo sends' },
      { key: 'comms.bulk', label: 'Bulk email to cohort sends' },
      { key: 'comms.from', label: 'Email "from" branding uses agency domain' },
    ],
  },
  {
    key: 'admin',
    title: 'Admin / sales',
    items: [
      { key: 'adm.switcher', label: 'Admin role-switcher impersonates correctly' },
      { key: 'adm.prospect', label: 'Prospecting workbench loads HUD PHAs' },
      { key: 'adm.brief', label: 'Generate agency brief PDF' },
      { key: 'adm.trust', label: '/trust page renders' },
    ],
  },
  {
    key: 'visual',
    title: 'Visual / responsive spot-check',
    items: [
      { key: 'vis.overview', label: 'Agency Overview at 1280px' },
      { key: 'vis.batch', label: "HAP Batch Detail table doesn't overflow" },
      { key: 'vis.insp', label: 'Compliance > Inspections at mobile width' },
      { key: 'vis.landing', label: 'Landing page at mobile width' },
    ],
  },
  {
    key: 'teardown',
    title: 'Teardown',
    items: [
      { key: 'td.remove', label: 'Remove all qa-* demo agencies' },
    ],
  },
];

export const ALL_ITEM_KEYS = LAUNCH_QA_SECTIONS.flatMap((s) => s.items.map((i) => i.key));
