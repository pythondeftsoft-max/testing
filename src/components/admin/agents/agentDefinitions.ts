import { Crown, Search, BarChart3, Zap, RefreshCw, Briefcase, BookOpen, FileText, Newspaper } from 'lucide-react';

export type AgentStatus = 'active' | 'idle' | 'error' | 'not_configured';

export type AgentDepartment = 'leadership' | 'operations' | 'revenue' | 'intelligence';

export interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface AgentActivity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  relatedAgent?: string;
}

export interface AgentGoal {
  id: string;
  label: string;
  target: number;
  current: number;
  unit: string;
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  agentName: string;
  key: string;
  value: string;
  createdAt: string;
  ttlHours: number;
}

export interface AgentDoc {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  content: string;
}

export interface ApprovalItem {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  detail: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: typeof Crown;
  colorClass: string;
  bgClass: string;
  status: AgentStatus;
  department: AgentDepartment;
  currentTask: string;
  keyMetric: string;
  lastActive: string;
  tasks: AgentTask[];
  activities: AgentActivity[];
  goals: AgentGoal[];
  communications: AgentActivity[];
  memory: MemoryEntry[];
  docs: AgentDoc[];
}

export const departmentLabels: Record<AgentDepartment, string> = {
  leadership: 'Leadership',
  operations: 'Operations',
  revenue: 'Revenue',
  intelligence: 'Intelligence',
};

export const companyMission = {
  title: 'Connect Section 8 Voucher Holders with Affordable Housing',
  description: 'Help as many families as possible, as fast as possible. Revenue follows impact — every placement matters.',
  targetMetric: 10,
  currentMetric: 0,
  unit: 'placements',
  currentPhase: 'Foundation',
  phaseDetail: 'Month 1-2 — Prove the model in Dallas',
  phases: [
    { name: 'Foundation', months: '1-2', target: '5-10 placements', focus: 'Dallas TX', question: 'Can we consistently place tenants?' },
    { name: 'Acceleration', months: '3-4', target: '20-35 placements', focus: 'Add Houston, Atlanta', question: 'Can we scale without breaking?' },
    { name: 'Scale', months: '5-6', target: '50-80 placements', focus: '5 cities, 90% automation', question: 'Can we run mostly on autopilot?' },
    { name: 'Domination', months: '7+', target: '100+ placements/mo', focus: 'Optimize and expand', question: 'Market leadership' },
  ],
};

export const mockApprovals: ApprovalItem[] = [
  {
    id: 'ap1',
    agentId: 'scout',
    agentName: 'Scout',
    title: 'Add 12 new listings',
    detail: 'Scout found 12 properties in Houston NW matching criteria. Approve to add to pipeline.',
    timestamp: '2026-03-23T09:15:00Z',
    priority: 'high',
  },
  {
    id: 'ap2',
    agentId: 'sales',
    agentName: 'Sales',
    title: 'Send outreach to 5 landlords',
    detail: 'Sales drafted personalized emails for 5 landlord contacts. Approve to send.',
    timestamp: '2026-03-23T09:10:00Z',
    priority: 'medium',
  },
  {
    id: 'ap3',
    agentId: 'matchmaker',
    agentName: 'Matchmaker',
    title: 'Push 8 matches to tenants',
    detail: 'Matchmaker identified 8 high-scoring matches (85+ pts). Approve SMS/email push.',
    timestamp: '2026-03-23T09:05:00Z',
    priority: 'high',
  },
  {
    id: 'ap4',
    agentId: 'content-seo',
    agentName: 'AP',
    title: 'Publish blog draft',
    detail: '"Top 10 Houston Neighborhoods for Renters" — 1,200 words, SEO-optimized.',
    timestamp: '2026-03-23T08:50:00Z',
    priority: 'low',
  },
];

export const agentDefinitions: AgentDefinition[] = [
  {
    id: 'ceo',
    name: 'CEO',
    role: 'Orchestrator',
    description: 'Orchestrates all agents. Revenue follows impact — every placement matters. Speed and quality over perfect planning.',
    icon: Crown,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    status: 'idle',
    department: 'leadership',
    currentTask: '9 AM: Set daily priorities, check agent health',
    keyMetric: '0 placements this week',
    lastActive: '2026-03-23T09:00:00Z',
    tasks: [
      { id: 't1', title: '9 AM — Check yesterday results, set 3 priorities', status: 'pending', createdAt: '2026-03-23T09:00:00Z' },
      { id: 't2', title: 'Monitor agents, remove blockers throughout day', status: 'pending', createdAt: '2026-03-23T09:05:00Z' },
      { id: 't3-ceo', title: '6 PM — Review day, post summary, plan tomorrow', status: 'pending', createdAt: '2026-03-23T09:05:00Z' },
      { id: 't4-ceo', title: 'Post daily report to Discord #openkey-ceo', status: 'pending', createdAt: '2026-03-23T09:10:00Z' },
    ],
    activities: [
      { id: 'a1', action: 'Directive', detail: 'Foundation phase active. Dallas is primary market — prove the model here first.', timestamp: '2026-03-23T09:00:00Z' },
      { id: 'a2', action: 'Strategy', detail: 'Set daily targets: 1 property added, 3 landlord contacts, 1 positive response.', timestamp: '2026-03-23T09:02:00Z' },
    ],
    goals: [
      { id: 'g1', label: 'Properties Added / Day', target: 1, current: 0, unit: 'properties' },
      { id: 'g2', label: 'Landlords Contacted / Day', target: 3, current: 0, unit: 'contacts' },
      { id: 'g2b', label: 'Positive Responses / Day', target: 1, current: 0, unit: 'responses' },
      { id: 'g2c', label: 'Placements / Week', target: 3, current: 0, unit: 'placements' },
      { id: 'g2d', label: 'Pipeline Properties / Week', target: 20, current: 0, unit: 'properties' },
    ],
    communications: [
      { id: 'c1', action: 'CEO → Scout', detail: 'Focus Dallas properties exclusively. Prove the model here first. No Houston until we have 5+ placements.', timestamp: '2026-03-23T09:05:00Z', relatedAgent: 'scout' },
      { id: 'c2', action: 'CEO → Sales', detail: '3 landlord contacts per day minimum. Quality over quantity — we need partners who believe in Section 8.', timestamp: '2026-03-23T09:06:00Z', relatedAgent: 'sales' },
      { id: 'c3', action: 'CEO → All Agents', detail: 'We are in Foundation phase. Every single placement matters. Speed beats perfection. Depth before breadth.', timestamp: '2026-03-23T09:07:00Z' },
      { id: 'c4', action: 'CEO → Analyzer', detail: 'Prioritize scoring for Dallas properties first. Any unit under $1,200/mo with a match score above 80 gets flagged immediately.', timestamp: '2026-03-23T09:08:00Z', relatedAgent: 'analyzer' },
      { id: 'c5', action: 'CEO → Research', detail: 'Need Dallas Section 8 payment standards and vacancy data ASAP. This drives our pricing strategy.', timestamp: '2026-03-23T09:09:00Z', relatedAgent: 'research' },
    ],
    memory: [
      { id: 'm1', agentId: 'ceo', agentName: 'CEO', key: 'current_phase', value: 'Foundation (Month 1-2) — Prove the model in Dallas', createdAt: '2026-03-23T09:00:00Z', ttlHours: 720 },
      { id: 'm2', agentId: 'ceo', agentName: 'CEO', key: 'daily_priority', value: 'Focus Dallas pipeline. 1 property, 3 contacts, 1 positive response.', createdAt: '2026-03-23T09:00:00Z', ttlHours: 24 },
      { id: 'm1b', agentId: 'ceo', agentName: 'CEO', key: 'primary_market', value: 'Dallas, TX — prove here first before expanding', createdAt: '2026-03-23T08:00:00Z', ttlHours: 720 },
      { id: 'm1c', agentId: 'ceo', agentName: 'CEO', key: 'secondary_market', value: 'Houston, TX — expand once Dallas stable', createdAt: '2026-03-23T08:00:00Z', ttlHours: 720 },
      { id: 'm1d', agentId: 'ceo', agentName: 'CEO', key: 'tertiary_market', value: 'Atlanta, GA — add when ready for 3rd city', createdAt: '2026-03-23T08:00:00Z', ttlHours: 720 },
      { id: 'm1e', agentId: 'ceo', agentName: 'CEO', key: 'north_star', value: 'Housing families is the win. Everything else supports that.', createdAt: '2026-03-23T08:00:00Z', ttlHours: 720 },
    ],
    docs: [
      {
        id: 'd1', agentId: 'ceo', title: 'CEO Operating Manual', updatedAt: '2026-03-23T09:00:00Z',
        content: `# CEO Operating Manual — OpenKey Housing

## Mission
Connect Section 8 voucher holders with affordable housing.
Help as many families as possible, as fast as possible.
Revenue follows impact — every placement matters.

## North Star
Speed and quality over perfect planning.
Housing families is the win. Everything else supports that.

## Principles
- **Revenue follows impact** — placements drive everything
- **Speed beats perfection** — move fast, iterate
- **Depth before breadth** — master Dallas before expanding
- **Data drives decisions** — no guessing
- **Automate everything possible** — humans for strategy, AI for execution

## Daily Rhythm
- **9 AM**: Check yesterday, set 3 priorities, post plan
- **Throughout**: Monitor agents, remove blockers, adjust
- **6 PM**: Review day, post summary, plan tomorrow

## Team Structure (Reports to CEO)
- **CTO** — Builds tools, automation, APIs
- **CMO / Content** — Content, videos, SEO, leads
- **Sales** — Landlord outreach and closing
- **Operations (Matchmaker)** — Matching, pushes, follow-ups
- **Scout** — Property scraping, analysis, prioritization
- **Research** — Market intel, trends, policy

## When to Adjust
- **AHEAD**: Accelerate, increase targets 20%, expand early
- **ON TARGET**: Maintain, optimize, prepare next phase
- **BEHIND**: Find bottleneck, focus resources, simplify
- **FAILING**: Emergency analysis, chairman input, pivot or fix fast

## The Mindset
I'm the conductor. Founder sets vision, I figure out how.
Celebrate wins, fix problems fast, never lose sight of housing families.`
      },
      {
        id: 'd2', agentId: 'ceo', title: 'Daily Report Template (Discord)', updatedAt: '2026-03-23T09:00:00Z',
        content: `# Daily Report Template

## Format for Discord #openkey-ceo

📊 **CEO DAILY — [Date]**

🎯 **TODAY**: Placements X | Properties X | Contacts X | Pushes X
📈 **WEEK**: Progress toward goal | Revenue $X
🏆 **ALL-TIME**: Total placements X | Revenue $X | Families X
✅ **WINS**: [What worked]
⚠️ **ISSUES**: [What's stuck]
📋 **TOMORROW**: [Top 3 priorities]
💬 **TO CHAIRMAN**: [Strategic questions]

## Guidelines
- Post at 6 PM daily
- Be honest about numbers — no fluffing
- Always include all-time totals (families housed matters most)
- Flag blockers early — don't wait until they're critical`
      },
      {
        id: 'd3-ceo', agentId: 'ceo', title: 'Progressive Scale Roadmap', updatedAt: '2026-03-23T09:00:00Z',
        content: `# Progressive Scale Roadmap

*Goals are direction, not rigid orders. Adjust based on reality.*

## Phase 1: Foundation (Month 1-2)
- **Target direction**: 5-10 placements
- **Focus**: Dallas primarily
- **Key question**: Can we consistently place tenants?
- **Daily wins**: 1 property added, 3 landlords contacted, 1 positive response

## Phase 2: Acceleration (Month 3-4)
- **Target direction**: 20-35 placements
- **Focus**: Add Houston, Atlanta
- **Key question**: Can we scale without breaking?

## Phase 3: Scale (Month 5-6)
- **Target direction**: 50-80 placements
- **Focus**: 5 cities, 90% automation
- **Key question**: Can we run mostly on autopilot?

## Phase 4: Domination (Month 7+)
- **Target direction**: 100+ placements monthly
- **Focus**: Optimize and expand
- **Key question**: Are we the market leader?

## Geographic Priority
1. **DALLAS, TX** — Primary market (prove here first)
2. **HOUSTON, TX** — Secondary (expand once Dallas stable)
3. **ATLANTA, GA** — Tertiary (add when ready)
4. **FUTURE**: Austin, San Antonio, Phoenix, Charlotte (data-driven expansion)`
      },
    ],
  },
  {
    id: 'scout',
    name: 'Scout',
    role: 'Property Finder',
    description: 'Scrapes Trulia and other sources via Firecrawl to discover new rental listings daily.',
    icon: Search,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    status: 'not_configured',
    department: 'operations',
    currentTask: 'Awaiting Firecrawl setup',
    keyMetric: '0 properties found today',
    lastActive: '—',
    tasks: [
      { id: 't3', title: 'Scrape Trulia — Houston NW', status: 'pending', createdAt: '2026-03-23T06:00:00Z' },
      { id: 't4', title: 'Scrape Trulia — Houston SW', status: 'pending', createdAt: '2026-03-23T06:00:00Z' },
    ],
    activities: [],
    goals: [
      { id: 'g3', label: 'Listings Found / Day', target: 50, current: 0, unit: 'listings' },
      { id: 'g4', label: 'Unique Properties / Week', target: 200, current: 0, unit: 'properties' },
    ],
    communications: [],
    memory: [
      { id: 'm3', agentId: 'scout', agentName: 'Scout', key: 'houston_nw_last_scraped', value: '2026-03-23 06:00 — 0 new results', createdAt: '2026-03-23T06:00:00Z', ttlHours: 24 },
      { id: 'm4', agentId: 'scout', agentName: 'Scout', key: 'houston_sw_queue', value: '14 URLs pending scrape', createdAt: '2026-03-23T05:30:00Z', ttlHours: 12 },
    ],
    docs: [],
  },
  {
    id: 'analyzer',
    name: 'Analyzer',
    role: 'Match Scorer',
    description: 'Scores discovered properties against the tenant pool using the 100-point match engine.',
    icon: BarChart3,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    status: 'not_configured',
    department: 'operations',
    currentTask: 'Waiting for Scout data',
    keyMetric: '0 properties scored',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g5', label: 'Properties Scored / Day', target: 50, current: 0, unit: 'scored' },
      { id: 'g6', label: 'Avg Match Score', target: 75, current: 0, unit: 'pts' },
    ],
    communications: [],
    memory: [
      { id: 'm5', agentId: 'analyzer', agentName: 'Analyzer', key: 'top_match_today', value: 'Unit 4B @ Pine Creek — 92pts', createdAt: '2026-03-23T07:45:00Z', ttlHours: 12 },
    ],
    docs: [],
  },
  {
    id: 'matchmaker',
    name: 'Matchmaker',
    role: 'Auto-Push',
    description: 'Automatically pushes high-scoring matches to tenants via SMS and email.',
    icon: Zap,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
    status: 'not_configured',
    department: 'operations',
    currentTask: 'Waiting for Analyzer results',
    keyMetric: '0 matches pushed',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g7', label: 'Matches Pushed / Day', target: 20, current: 0, unit: 'pushed' },
      { id: 'g8', label: 'Response Rate', target: 40, current: 0, unit: '%' },
    ],
    communications: [],
    memory: [],
    docs: [],
  },
  {
    id: 'reactivation',
    name: 'Reactivation',
    role: 'Ghost Buster',
    description: 'Identifies inactive tenants and sends re-engagement SMS/email after configurable silence periods.',
    icon: RefreshCw,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    status: 'not_configured',
    department: 'operations',
    currentTask: 'Awaiting configuration',
    keyMetric: '0 tenants re-engaged',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g9', label: 'Tenants Re-engaged / Week', target: 15, current: 0, unit: 'tenants' },
      { id: 'g10', label: 'Reactivation Rate', target: 25, current: 0, unit: '%' },
    ],
    communications: [],
    memory: [],
    docs: [],
  },
  {
    id: 'sales',
    name: 'Sales',
    role: 'Landlord Outreach',
    description: 'Finds landlord contacts, sends templated outreach emails, and tracks responses.',
    icon: Briefcase,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10',
    status: 'not_configured',
    department: 'revenue',
    currentTask: 'Awaiting configuration',
    keyMetric: '0 landlords contacted',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g11', label: 'Outreach Sent / Week', target: 50, current: 0, unit: 'emails' },
      { id: 'g12', label: 'Reply Rate', target: 10, current: 0, unit: '%' },
    ],
    communications: [],
    memory: [],
    docs: [],
  },
  {
    id: 'research',
    name: 'Research',
    role: 'Market Intel',
    description: 'Monitors market trends, rent prices, and housing policy changes across target areas.',
    icon: BookOpen,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10',
    status: 'not_configured',
    department: 'intelligence',
    currentTask: 'Awaiting configuration',
    keyMetric: '0 reports generated',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g13', label: 'Reports / Week', target: 3, current: 0, unit: 'reports' },
      { id: 'g14', label: 'Data Points Tracked', target: 500, current: 0, unit: 'points' },
    ],
    communications: [],
    memory: [
      { id: 'm6', agentId: 'research', agentName: 'Research', key: 'avg_rent_houston_sw', value: '$1,150/mo — down 3% from last month', createdAt: '2026-03-23T07:00:00Z', ttlHours: 48 },
    ],
    docs: [
      { id: 'd3', agentId: 'research', title: 'Houston Market Report — March 2026', updatedAt: '2026-03-22T16:00:00Z', content: '# Houston Rental Market — March 2026\n\n## Key Findings\n- Average rent in SW Houston: **$1,150/mo** (down 3%)\n- Vacancy rate: **8.2%** (up from 7.1% in Feb)\n- New construction permits: **+12%** YoY\n\n## Opportunities\n- NW Houston seeing landlord price drops — good for tenant pipeline\n- Spring lease cycle starting — expect 20% more listings in April\n\n## Risks\n- Insurance costs rising in flood zones\n- 2 major complexes converting to condos in Midtown' },
    ],
  },
  {
    id: 'content-seo',
    name: 'AP',
    role: 'Auto-Publisher',
    description: 'Publishes 5+ content pieces daily across 5 pillars with geographic targeting. Generates state, city, and zipcode authority pages plus blog posts using Firecrawl research + Gemini. Phase-balanced to grow TX anchors and nationwide markets simultaneously.',
    icon: FileText,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    status: 'active',
    department: 'intelligence',
    currentTask: '5x daily: state/city/zip pages + blog posts across 5 pillars',
    keyMetric: '5 posts/day target | 125+ markets queued',
    lastActive: '—',
    tasks: [
      { id: 't-seo-1', title: 'Publish location authority pages for queued cities', status: 'in_progress', createdAt: '2026-03-27T09:00:00Z' },
      { id: 't-seo-2', title: 'Rotate blog posts across 5 content pillars', status: 'in_progress', createdAt: '2026-03-27T09:00:00Z' },
      { id: 't-seo-3', title: 'Research trending topics via Firecrawl', status: 'pending', createdAt: '2026-03-27T09:00:00Z' },
    ],
    activities: [],
    goals: [
      { id: 'g15', label: 'Posts / Day', target: 5, current: 0, unit: 'posts' },
      { id: 'g16', label: 'Location Pages / Week', target: 15, current: 0, unit: 'pages' },
      { id: 'g17', label: 'States Covered', target: 15, current: 0, unit: 'states' },
      { id: 'g17b', label: 'Cities Covered', target: 20, current: 0, unit: 'cities' },
      { id: 'g18', label: 'Pillars Active', target: 5, current: 5, unit: 'pillars' },
      { id: 'g19', label: 'Phase 2 Pages / Week', target: 7, current: 0, unit: 'pages' },
    ],
    communications: [],
    memory: [
      { id: 'm7', agentId: 'content-seo', agentName: 'AP', key: 'daily_target', value: '5 posts/day — 3 location pages + 2 blog posts, 1 Phase 2 forced', createdAt: '2026-03-27T09:00:00Z', ttlHours: 720 },
      { id: 'm8', agentId: 'content-seo', agentName: 'AP', key: 'pillars_active', value: 'Tenants & Section 8, Landlords, Property Managers, Real Estate & Market, Housing News', createdAt: '2026-03-27T09:00:00Z', ttlHours: 720 },
      { id: 'm9', agentId: 'content-seo', agentName: 'AP', key: 'location_queue', value: '125+ entries: State pages (P0) + Phase 1 TX cities (P1) + Phase 2 nationwide (P2) + TX zips (P3)', createdAt: '2026-03-27T09:00:00Z', ttlHours: 720 },
      { id: 'm10', agentId: 'content-seo', agentName: 'AP', key: 'page_types', value: 'section8_state, section8_city, section8_zip, landlord_state, landlord_city, rent_data_state, rent_data_city, pm_city', createdAt: '2026-03-27T09:00:00Z', ttlHours: 720 },
    ],
    docs: [
      {
        id: 'd4', agentId: 'content-seo', title: 'Auto-Publisher Operating Manual', updatedAt: '2026-03-27T09:00:00Z',
        content: `# AP (Auto-Publisher) Operating Manual

## Mission
Publish 5+ content pieces daily to build geographic authority and compete with Zillow, AffordableHousing.com, DoorLoop, and AppFolio.

## 5 Content Pillars
1. **Tenants & Section 8** — Voucher eligibility, city guides, waiting lists
2. **Landlords** — How to accept vouchers, benefits, inspection prep
3. **Property Managers** — Software comparisons, PM tips, automation
4. **Real Estate & Market** — Rent data, trends, market analysis
5. **Housing News** — HUD policy, legislation, housing crisis coverage

## Page Types
- **State pages** (section8_state, landlord_state, rent_data_state) — Priority 0
- **City pages** (section8_city, landlord_city, rent_data_city, pm_city) — Priority 1-2
- **Zipcode pages** (section8_zip) — Priority 3

## Daily Mix
| Slot | Type | Selection |
|------|------|-----------|
| 9 AM | Location page | Phase 1 (TX) |
| 12 PM | Blog post | Pillar rotation |
| 3 PM | Location page | Phase 2 (nationwide) — forced |
| 6 PM | Blog post | Pillar rotation |
| 9 PM | Location or blog | Whichever is behind ratio |

## Phase Balancing
At least 1 Phase 2 (nationwide) location per day guaranteed.

## Geographic Strategy
- Priority 0: State-level pages (15 states × 3 types)
- Priority 1: TX anchor cities (6 cities × 4 types)
- Priority 2: Top 20 Section 8 markets nationwide (14 cities × 4 types)
- Priority 3: TX zipcode depth (~30 zips)`
      },
    ],
  },
  {
    id: 'briefing',
    name: 'Billy',
    role: 'Daily Brief',
    description: 'Posts a daily platform briefing to Discord — signups, properties, applications, totals, and call list status.',
    icon: Newspaper,
    colorClass: 'text-sky-500',
    bgClass: 'bg-sky-500/10',
    status: 'active',
    department: 'intelligence',
    currentTask: 'Daily brief at 9:00 AM EST',
    keyMetric: 'Briefs posted daily',
    lastActive: '—',
    tasks: [],
    activities: [],
    goals: [
      { id: 'g-billy-1', label: 'Briefs Posted / Week', target: 7, current: 0, unit: 'briefs' },
    ],
    communications: [],
    memory: [],
    docs: [],
  },
];
