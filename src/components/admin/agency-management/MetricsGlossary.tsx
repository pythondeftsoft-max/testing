import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Book, ExternalLink } from 'lucide-react';

interface GlossaryEntry {
  key: string;
  label: string;
  what: string;
  why: string;
  source: string;
  pullable: 'have' | 'easy' | 'medium' | 'hard' | 'no';
  pullablePlan: string;
  links?: { label: string; url: string }[];
}

const ENTRIES: GlossaryEntry[] = [
  {
    key: 'registry',
    label: 'Registry',
    what: 'PHAs whose registry row has at least one HUD-derived enrichment field populated (population, voucher count, MTW flag, SEMAP score, or a row in pha_enrichment).',
    why: 'Tells you what % of the active HUD universe we have any signal on. The denominator excludes 118 stale rows (PHAs no longer in the live HUD roster).',
    source: 'HUD ArcGIS Public Housing Authorities feature server + US Census ACS5 + MTW cohort list.',
    pullable: 'have',
    pullablePlan: 'Already at ~98%. The remaining ~70 are usually closed, merged, or state agencies HUD reports differently.',
    links: [{ label: 'HUD ArcGIS PHA Registry', url: 'https://hudgis-hud.opendata.arcgis.com/datasets/HUD::public-housing-authorities/about' }],
  },
  {
    key: 'units',
    label: 'Units',
    what: 'PHAs where we know at least one of: HCV vouchers, Section 8 units, total units, or PSH (permanent supportive housing) units.',
    why: 'Unit count is the single most important variable in pricing — every dollar figure (admin budget, payroll, SaaS wallet) is derived from leased units × admin fee per unit.',
    source: 'HUD ArcGIS PHA Registry (capfund + opfund + Section 8 fields).',
    pullable: 'have',
    pullablePlan: 'Coverage is at ~98%. Missing rows are typically PHAs with zero authorized units (closed programs).',
  },
  {
    key: 'admin_fees',
    label: 'Admin fees (Col A / Col B)',
    what: 'HUD-published per-voucher administrative fee a PHA receives each month. Col A applies to the first ~7,200 leased units, Col B to units above that.',
    why: 'Gold standard for sizing a PHA. Multiplied by leased units × 12 months = official annual admin budget — the pot we charge from. Without it, we fall back to a $85/unit/month national average.',
    source: 'HUD CFO Admin Fee Schedule (.xlsx, published yearly via PIH Notice).',
    pullable: 'easy',
    pullablePlan: 'AUTOMATED — click "Sync from HUD now" in the HUD Admin Fee Schedule widget below. Pulls the current CY .xlsx and upserts ~3,800 PHAs in one shot. URL is configurable in system_config when HUD posts a new year.',
    links: [
      { label: 'CY 2025 PIH Notice (PDF)', url: 'https://www.hud.gov/sites/default/files/PIH/documents/CY_2025_AdminFeeRateDescription_February2025.pdf' },
      { label: 'PIH 2025-13', url: 'https://www.hud.gov/sites/dfiles/OCHCO/documents/2025-13pihn.pdf' },
    ],
  },
  {
    key: 'saas_wallet',
    label: 'SaaS wallet & full operator cost stack',
    what: 'How a PHA actually spends its admin budget. Industry rule: 45% frontline payroll (caseworkers, inspectors), 18% mgmt + admin payroll (ED, finance, HR), 8% occupancy/utilities, 5% software + IT, 7% training/audits/legal, 12% direct program costs (HQS contractors, port-out fees), 5% reserves. SaaS wallet = 2–6% of admin (4–10% for MTW) — the realistic dollar range we can capture annually.',
    why: 'The "Software + IT" line (~5% of admin) is the budget pot we displace. Landing inside it means the PHA can sign without going through procurement for a new line item. The wallet band gives sales the floor and ceiling; the suggested quote (next entry) picks the right spot inside it.',
    source: 'Cost-stack defaults in src/lib/prospectPricing.ts — sourced from HUD financial assessments + NAHRO operator surveys. Wallet math: admin_budget × {2–6% non-MTW, 4–10% MTW}.',
    pullable: 'have',
    pullablePlan: 'Already wired. Improves automatically once you sync the HUD admin fee schedule (the cost-stack rebases from official numbers instead of $85/unit fallback).',
  },
  {
    key: 'suggested_quote',
    label: 'Suggested quote (annual / monthly / per-voucher / setup)',
    what: 'Concrete sales numbers derived from the wallet band: annual = midpoint of 2–6% (so 4% non-MTW, 7% MTW), rounded to the nearest $500. Monthly = annual / 12. Per-voucher/month = monthly / leased units. Three setup-fee options offered: $0 (close-faster), 5% of ARR (standard), 15% of ARR (heavy migration).',
    why: 'PHAs hate one-time line items they have to budget against — recurring SaaS slides into existing IT operating budget without procurement. Free setup wins SMB PHAs faster; standard 5% covers onboarding labor; heavy 15% is for replacing legacy systems (WinTen2+, custom SQL) with data migration + IRIS / EIV / VMS hooks.',
    source: 'Derived from wallet midpoint in src/lib/prospectPricing.ts.',
    pullable: 'have',
    pullablePlan: 'Quote is shown in the Wallet card on every prospect drawer. Setup-fee picker is interactive — click to compare the three options side-by-side.',
  },
  {
    key: 'utilization',
    label: 'Utilization',
    what: 'Percentage of authorized vouchers that are actually leased up (leased_units / authorized_units).',
    why: 'Under-utilization (<90%) signals soft rental market or struggling leasing operations — strong sales hook for landlord-recruitment tools. Over-utilization (>100%) signals HUD pressure to recapture funds — sales hook for forecasting tools.',
    source: 'Derived from HUD ArcGIS leased_units + authorized_units (already loaded).',
    pullable: 'have',
    pullablePlan: 'Free win — math on data we already have. Coverage tracks Units coverage.',
  },
  {
    key: 'websites',
    label: 'Websites',
    what: 'Active PHAs where we have a website URL on file (HUD-listed or inferred from the executive director\'s email domain).',
    why: 'Required precondition for tech-stack scanning, ED contact research, and outreach personalization.',
    source: 'HUD ArcGIS PHA Registry website field + ED email domain inference.',
    pullable: 'medium',
    pullablePlan: '~80% today. Remaining 20% need either Google Custom Search inference (e.g. "PHA name + housing authority site:.gov") or manual research. Could wire a one-shot backfill job.',
  },
  {
    key: 'web_scanned',
    label: 'Web scanned',
    what: 'PHAs where we\'ve completed a Firecrawl scan of their website to detect tech stack (Yardi vs Emphasys vs HAPPY vs WinTen2+, payment processors, login systems, etc.).',
    why: 'Tech stack is the strongest competitive signal. A PHA on Yardi Voyager is a different sale than one on a 1990s WinTen2+ green-screen system. Drives "Replace ___" plays in outreach.',
    source: 'Firecrawl per-PHA website scan (server-side, ~$0.01/PHA).',
    pullable: 'medium',
    pullablePlan: 'Cost-bound, not data-bound. Wiring exists but the batch job was never built. ~$40 to scan all 3,039 known sites; would unlock tech-stack chips on every prospect row.',
    links: [{ label: 'Firecrawl', url: 'https://firecrawl.dev' }],
  },
  {
    key: 'mtw',
    label: 'MTW (Moving to Work)',
    what: 'PHAs in HUD\'s MTW demonstration — they get block-grant flexibility instead of standard HCV/PH funding rules.',
    why: 'MTW agencies have more autonomy, larger budgets, and more software discretion. They typically buy custom enterprise tools instead of off-the-shelf. Wallet pricing widens (4–10% vs 2–6%).',
    source: 'HUD MTW cohort list (~39 PHAs as of latest publication).',
    pullable: 'have',
    pullablePlan: 'Complete — small fixed list, updated annually when HUD admits new MTW cohorts.',
    links: [{ label: 'HUD MTW page', url: 'https://www.hud.gov/program_offices/public_indian_housing/programs/ph/mtw' }],
  },
];

const PULLABLE_BADGE: Record<GlossaryEntry['pullable'], { label: string; cls: string }> = {
  have: { label: 'Have it', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  easy: { label: 'Easy to add', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  medium: { label: 'Medium effort', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  hard: { label: 'Hard / costly', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  no: { label: 'Not pullable', cls: 'bg-muted text-muted-foreground border-border' },
};

export function MetricsGlossary() {
  return (
    <Card>
      <CardContent className="p-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="glossary" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Book className="h-4 w-4 text-primary" />
                What does each metric mean? (and what else can we pull)
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {ENTRIES.map((entry) => {
                  const badge = PULLABLE_BADGE[entry.pullable];
                  return (
                    <div key={entry.key} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{entry.label}</span>
                        <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                      </div>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-medium text-muted-foreground">What</dt>
                          <dd>{entry.what}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-medium text-muted-foreground">Why care</dt>
                          <dd>{entry.why}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-medium text-muted-foreground">Source</dt>
                          <dd className="font-mono text-[11px]">{entry.source}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-medium text-muted-foreground">More?</dt>
                          <dd>{entry.pullablePlan}</dd>
                        </div>
                        {entry.links && entry.links.length > 0 && (
                          <div className="flex gap-2 pt-1">
                            <dt className="w-20 shrink-0 font-medium text-muted-foreground">Links</dt>
                            <dd className="flex flex-wrap gap-2">
                              {entry.links.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {link.label}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="mb-1 font-semibold">Quick action items</div>
                  <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                    <li><strong>Biggest unlock (1 click):</strong> Hit "Sync from HUD now" in the Admin Fee Schedule widget → official wallet bands for ~3,800 PHAs.</li>
                    <li><strong>Cost-bound:</strong> Trigger a Firecrawl scan pass on the 3,039 known websites (~$40) → tech-stack chips for every prospect.</li>
                    <li><strong>SEMAP scores:</strong> HUD stopped publishing them publicly after FY2019. Skip — data is stale.</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
