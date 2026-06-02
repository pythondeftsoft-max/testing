import {
  LayoutDashboard, Users, Shield, DollarSign, MessageSquare, Settings,
  ListOrdered, ClipboardCheck, ClipboardList, UserCog,
  Building, Gavel,
  Calculator, Receipt, HandCoins,
  Mail, BarChart3, FileDown, Printer,
  CalendarRange, SlidersHorizontal, Plug, History, Wallet,
  UsersRound, RefreshCw, Cog,
  type LucideIcon,
} from 'lucide-react';

export interface AgencySubItem {
  value: string;
  label: string;
  icon: LucideIcon;
  visible: boolean;
}

export interface AgencyNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  visible: boolean;
  children?: AgencySubItem[];
  /** Default sub-tab to land on when the group is selected without a sub */
  defaultSub?: string;
}

export interface BuildNavParams {
  // Top-level group visibility
  showCaseload: boolean;
  showCompliance: boolean;
  showFinance: boolean;
  showComms: boolean;
  showAdmin: boolean;
  // Caseload sub-flags
  canViewWaitlist: boolean;
  canViewCaseload: boolean;
  canViewRfta: boolean;
  canViewPlacements: boolean;
  canViewRecerts: boolean;
  isCaseworker: boolean;
  isSupervisor: boolean;
  // Team sub-flags
  showTeam: boolean;
  showTeamCaseworkers: boolean;
  showTeamInspectors: boolean;
  // Compliance sub-flags
  canViewInspections: boolean;
  canViewProperties: boolean;
  canViewHearings: boolean;
  canViewOversight: boolean;
  canManageInspectors: boolean;
  isInspector: boolean;
  // Finance sub-flags
  showHAPContracts: boolean;
  showHAPBatching: boolean;
  showRentCalc: boolean;
  showComparables: boolean;
  showBilling: boolean;
  // Comms sub-flags
  showNotices: boolean;
  showCommsTab: boolean;
  showReports: boolean;
  // Admin sub-flags
  isAdmin: boolean;
  showOperations: boolean;
}

/**
 * Maps legacy sub-tab values (pre-Phase G) to the new collapsed hub sub-values.
 * Used by the dashboard to keep deep-links and external nav working.
 */
export const LEGACY_SUB_REDIRECT: Record<string, string> = {
  // Caseload
  caseload: 'tenants',
  rfta: 'tenants',
  placements: 'tenants',
  recerts: 'tenants',
  fss: 'tenants',
  'cw-inspections': 'tenants',
  'cw-supervisor': 'workforce',
  // Compliance
  'lease-pipeline': 'inspections',
  oversight: 'inspections',
  'inspector-mgmt': 'inspections',
  landlords: 'properties',
  hearings: 'cases',
  accommodations: 'cases',
  // Finance
  hap_contracts: 'hap',
  hap_batching: 'hap',
  reconciliation: 'hap',
  payment_rails: 'hap',
  rent_calc: 'rent_income',
  eiv_center: 'rent_income',
  tenant_ledger: 'rent_income',
  comparables: 'rent_income',
  special_claims: 'claims_debt',
  repayments: 'claims_debt',
  billing: 'billing_tax',
  tax_center: 'billing_tax',
  // Phase J: Operations dissolved → its items rehome
  utility_schedules: '_setup',     // → Finance › ⚙ Setup (parent must change to 'finance')
  renewal_pipeline: 'renewals',    // → Caseload › Renewals
};

/** Phase J/K: parent-tab redirects when the legacy sub also requires changing groups. */
export const LEGACY_TAB_REDIRECT: Record<string, { tab: string; sub: string }> = {
  'operations:utility_schedules': { tab: 'finance', sub: '_setup' },
  'operations:renewal_pipeline':  { tab: 'caseload', sub: 'renewals' },
  // Phase K: Staff moved out of Back Office into Team.
  'operations:staff':             { tab: 'team', sub: 'people' },
  'admin:back_office:staff':      { tab: 'team', sub: 'people' },
};

export function buildAgencyNav(p: BuildNavParams): AgencyNavItem[] {
  const showHap = p.showHAPContracts || p.showHAPBatching;

  const items: AgencyNavItem[] = [
    {
      value: 'overview', label: 'Overview', icon: LayoutDashboard, visible: true,
    },
    {
      value: 'caseload', label: 'Caseload', icon: Users, visible: p.showCaseload,
      defaultSub: p.canViewWaitlist ? 'applications' : 'tenants',
      children: [
        { value: 'applications', label: 'Applications', icon: ClipboardList, visible: p.canViewWaitlist },
        { value: 'waitlist',  label: 'Waitlist',  icon: ListOrdered, visible: p.canViewWaitlist },
        { value: 'tenants',   label: p.isCaseworker ? 'My Tenants' : 'Tenants', icon: Users, visible: p.canViewCaseload },
        { value: 'renewals',  label: 'Renewals',  icon: RefreshCw, visible: p.canViewCaseload || p.isAdmin },
        // Workforce sub kept for caseload-supervisor users who don't see Team (legacy fallback)
        { value: 'workforce', label: 'Workforce', icon: UserCog, visible: p.isSupervisor && !p.showTeam },
        { value: '_setup',    label: 'Setup',     icon: Cog, visible: p.isAdmin },
      ],
    },
    {
      value: 'team', label: 'Team', icon: UsersRound, visible: p.showTeam,
      defaultSub: p.isAdmin ? 'people' : (p.showTeamCaseworkers ? 'caseworkers' : 'inspectors'),
      children: [
        { value: 'people',      label: 'People',      icon: UsersRound,    visible: p.isAdmin },
        { value: 'caseworkers', label: 'Caseworkers', icon: UserCog,        visible: p.showTeamCaseworkers },
        { value: 'inspectors',  label: 'Inspectors',  icon: ClipboardCheck, visible: p.showTeamInspectors },
        { value: '_setup',      label: 'Setup',       icon: Cog,            visible: p.isAdmin },
      ],
    },
    {
      value: 'compliance', label: 'Compliance', icon: Shield, visible: p.showCompliance,
      defaultSub: p.canViewInspections ? 'inspections' : p.canViewProperties ? 'properties' : 'cases',
      children: [
        { value: 'inspections', label: p.isInspector ? 'My Inspections' : 'Inspections', icon: ClipboardCheck, visible: p.canViewInspections },
        { value: 'properties',  label: 'Properties', icon: Building, visible: p.canViewProperties },
        { value: 'cases',       label: 'Cases',      icon: Gavel,    visible: true },
        { value: '_setup',      label: 'Setup',      icon: Cog,      visible: p.isAdmin },
      ],
    },
    {
      value: 'finance', label: 'Finance', icon: DollarSign, visible: p.showFinance,
      defaultSub: showHap ? 'hap' : 'rent_income',
      children: [
        { value: 'hap',         label: 'HAP',           icon: DollarSign, visible: showHap },
        { value: 'rent_income', label: 'Rent & Income', icon: Calculator, visible: true },
        { value: 'claims_debt', label: 'Claims & Debt', icon: HandCoins,  visible: true },
        { value: 'billing_tax', label: 'Billing & Tax', icon: Receipt,    visible: true },
        { value: '_setup',      label: 'Setup',         icon: Cog,        visible: p.isAdmin },
      ],
    },
    {
      value: 'comms', label: 'Communications', icon: MessageSquare, visible: p.showComms,
      defaultSub: p.showNotices ? 'notices' : p.showCommsTab ? 'comms' : 'reports',
      children: [
        { value: 'notices', label: 'Notices', icon: Mail,          visible: p.showNotices },
        { value: 'comms',   label: 'Comms',   icon: MessageSquare, visible: p.showCommsTab },
        { value: 'reports', label: 'Reports', icon: BarChart3,     visible: p.showReports },
        { value: 'semap',   label: 'SEMAP',   icon: FileDown,      visible: p.showReports },
        { value: 'docgen',  label: 'Doc Gen', icon: Printer,       visible: p.showNotices },
        { value: '_setup',  label: 'Setup',   icon: Cog,           visible: p.isAdmin },
      ],
    },
    {
      value: 'admin', label: 'Admin', icon: Settings, visible: p.showAdmin,
      defaultSub: 'schedule',
      children: [
        { value: 'schedule',      label: 'Schedule',      icon: CalendarRange,     visible: true },
        { value: 'configuration', label: 'Configuration', icon: SlidersHorizontal, visible: p.isAdmin },
        { value: 'integrations',  label: 'Integrations',  icon: Plug,              visible: p.isAdmin },
        { value: 'back_office',   label: 'Back Office',   icon: Cog,               visible: p.showOperations },
        { value: 'payouts',       label: 'Payouts',       icon: Wallet,            visible: p.isAdmin },
        { value: 'audit',         label: 'Audit',         icon: History,           visible: p.isAdmin },
      ],
    },
  ];

  return items
    .filter(i => i.visible)
    .map(i => ({ ...i, children: i.children?.filter(c => c.visible) }));
}
