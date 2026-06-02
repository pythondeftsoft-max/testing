// Canonical list of platform modules a PHA can subscribe to.
// Used in Convert-to-Customer wizard step 2 + agency-side onboarding preseed.

export interface PlatformModule {
  key: string;
  label: string;
  category: 'Caseload' | 'Compliance' | 'Finance' | 'Operations' | 'Comms';
  recommended?: boolean; // recommended baseline
}

export const PLATFORM_MODULES: PlatformModule[] = [
  // Caseload
  { key: 'waitlist', label: 'Waitlist Management', category: 'Caseload', recommended: true },
  { key: 'caseload', label: 'Caseload + Auto-Assignment', category: 'Caseload', recommended: true },
  { key: 'recerts', label: 'Annual Recertifications', category: 'Caseload', recommended: true },
  { key: 'voucher_lifecycle', label: 'Voucher Lifecycle Tracking', category: 'Caseload', recommended: true },
  { key: 'rfta', label: 'RFTA Workflow', category: 'Caseload' },

  // Compliance
  { key: 'inspections', label: 'Inspections (NSPIRE)', category: 'Compliance', recommended: true },
  { key: 'compliance_docs', label: 'Compliance Document Tracking', category: 'Compliance', recommended: true },
  { key: 'grievances', label: 'Grievance + Hearings', category: 'Compliance' },
  { key: 'accommodations', label: 'Reasonable Accommodations (504)', category: 'Compliance' },
  { key: 'hud_reporting', label: 'HUD-50058 Reporting', category: 'Compliance', recommended: true },

  // Finance
  { key: 'rent_calc', label: 'Rent Calculation Engine', category: 'Finance', recommended: true },
  { key: 'hap_batches', label: 'HAP Management + Batches', category: 'Finance', recommended: true },
  { key: 'nacha', label: 'NACHA ACH Origination', category: 'Finance' },
  { key: 'checkbook', label: 'Checkbook.io Disbursement', category: 'Finance' },
  { key: 'special_claims', label: 'Special Claims (52671)', category: 'Finance' },
  { key: 'repayment_agreements', label: 'Repayment Agreements', category: 'Finance' },
  { key: 'fss', label: 'FSS Program + Escrow', category: 'Finance' },

  // Operations
  { key: 'landlord_registry', label: 'Landlord Registry', category: 'Operations', recommended: true },
  { key: 'doc_vault', label: 'Collaborative Document Vault', category: 'Operations' },
  { key: 'porting', label: 'Porting + RFP Toolkit', category: 'Operations' },

  // Comms
  { key: 'comms', label: 'Email + Reminders', category: 'Comms', recommended: true },
];

export const RECOMMENDED_MODULE_KEYS = PLATFORM_MODULES.filter((m) => m.recommended).map((m) => m.key);

export function modulesByCategory() {
  const map = new Map<string, PlatformModule[]>();
  PLATFORM_MODULES.forEach((m) => {
    if (!map.has(m.category)) map.set(m.category, []);
    map.get(m.category)!.push(m);
  });
  return Array.from(map.entries());
}
