// Contextual help blurbs for in-app guidance.
// Keys are matched against the current pathname using startsWith semantics
// in HelpDrawer. Order matters — first match wins, so register the most
// specific routes first.

export type HelpRole = 'agency' | 'landlord' | 'tenant' | 'general';

export interface HelpEntry {
  /** Path prefix this entry applies to (e.g. "/agency"). Use "*" as catch-all. */
  match: string;
  role: HelpRole;
  title: string;
  /** Short markdown-style body. Lines starting with "- " render as bullets. */
  body: string;
}

export const HELP_ENTRIES: HelpEntry[] = [
  // ---------- Agency portal ----------
  {
    match: '/agency',
    role: 'agency',
    title: 'Agency Portal Overview',
    body: `Your housing authority command center. Use the top tabs to switch between modules.

- **Caseload** — work queue: waitlist, RFTA, recerts, placements
- **Compliance** — inspections, HUD-50058, doc expirations, SEMAP
- **Finance** — HAP contracts, batching, NACHA ACH, tax center, EIV
- **Communications** — bulk notices, reminders, messages
- **Operations** — staff, porting, utility schedules, renewal pipeline

Tip: the **Setup Health** banner (admins only) tracks your onboarding progress.`,
  },

  // ---------- Landlord portal ----------
  {
    match: '/landlord/payments',
    role: 'landlord',
    title: 'Landlord Payments & Statements',
    body: `Track every dollar you receive from the agency in one place.

- **HAP History** — every disbursement, filterable by month/property; export CSV
- **Statements** — monthly statements + downloadable **Annual Summary PDF** that reconciles to your 1099
- **1099** — year-end tax form summary
- **W-9** — keep your taxpayer info current (required for HAP payments)
- **Vacancies** — list a Section 8-ready unit straight to PHA matchmaker`,
  },
  {
    match: '/landlord',
    role: 'landlord',
    title: 'Landlord Portal',
    body: `Manage Section 8 tenants and HAP payments.

- **HAP** — current contracts and disbursements
- **Payments** — full history, statements, 1099, W-9
- **Inbox** — messages from your assigned PHA caseworker
- **Notifications** — inspection schedules, recert windows, lease expirations`,
  },

  // ---------- Catch-all ----------
  {
    match: '*',
    role: 'general',
    title: 'OpenKey Help',
    body: `Welcome. Navigate to your portal (Agency, Landlord, or Tenant) and tap the **?** icon any time for context-aware help on the current screen.

For deeper help: **Settings → Help & Support** or contact your account manager.`,
  },
];

/**
 * Resolve the best help entry for the current pathname.
 * Iterates entries in order, returning the first whose `match` is a prefix
 * of the pathname. Falls back to the "*" entry.
 */
export function resolveHelpEntry(pathname: string): HelpEntry {
  for (const entry of HELP_ENTRIES) {
    if (entry.match === '*') continue;
    if (pathname.startsWith(entry.match)) return entry;
  }
  return HELP_ENTRIES.find((e) => e.match === '*')!;
}
