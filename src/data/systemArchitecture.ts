/**
 * OpenKey System Architecture Manifest
 * 
 * Single source of truth for the system map. Hand-edit as the system evolves,
 * or click "Refresh Inventory" in /admin?tab=system-map to auto-scan.
 * 
 * Used by:
 *  - src/pages/admin/SystemMap.tsx (interactive React Flow canvas)
 *  - src/components/admin/system-map/InventoryTables.tsx (PDF export)
 *  - src/utils/systemMapExport.ts (PDF builder)
 */

export type LayerType = 'frontend' | 'database' | 'edge-function' | 'external' | 'workflow' | 'storage' | 'auth' | 'cron';

export interface SystemNode {
  id: string;
  label: string;
  layer: LayerType;
  group?: string;          // sub-grouping (e.g. "Payments", "Communications")
  description: string;
  files?: string[];        // related source files
  tables?: string[];       // related DB tables
  secrets?: string[];      // env vars / secrets used
  calledFrom?: string[];   // who invokes this
  calls?: string[];        // what this invokes
  url?: string;            // external link (docs, dashboard)
}

export interface SystemEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SystemWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[]; // node ids in order
}

// ─────────────────────────────────────────────────────────────────────
// FRONTEND PORTALS
// ─────────────────────────────────────────────────────────────────────
export const frontendNodes: SystemNode[] = [
  {
    id: 'fe-admin',
    label: 'Admin Portal',
    layer: 'frontend',
    group: 'Portals',
    description: 'Platform administrator console — user/role management, agency CRM, billing, analytics, content, system map.',
    files: ['src/pages/AdminDashboard.tsx', 'src/components/admin/AdminDashboard.tsx', 'src/components/admin/AdminSidebar.tsx'],
  },
  {
    id: 'fe-agency',
    label: 'Agency Portal (White-Label)',
    layer: 'frontend',
    group: 'Portals',
    description: 'White-labeled OS for Public Housing Authorities. 8 staff roles, subdomain routing, full HUD-compliance toolkit.',
    files: ['src/pages/agency/*', 'src/components/agency/*'],
    tables: ['housing_authorities', 'agency_staff', 'agency_offices'],
  },
  {
    id: 'fe-landlord',
    label: 'Landlord Portal',
    layer: 'frontend',
    group: 'Portals',
    description: 'Property owner dashboard. Section 8 enrollment, per-PHA unit registration, RFTA, HAP tracking.',
    files: ['src/pages/landlord/*', 'src/components/landlord/*'],
    tables: ['properties', 'property_units', 'agency_landlords', 'agency_landlord_units'],
  },
  {
    id: 'fe-tenant',
    label: 'Tenant Portal',
    layer: 'frontend',
    group: 'Portals',
    description: 'Housing seeker dashboard. Voucher tracking, match feed, application status, document vault.',
    files: ['src/pages/tenant/*', 'src/components/tenant/*'],
    tables: ['profiles', 'tenant_profiles', 'agency_vouchers'],
  },
  {
    id: 'fe-matchmaker',
    label: 'Matchmaker (Command Center)',
    layer: 'frontend',
    group: 'Portals',
    description: 'Operator console for matching tenants to properties. Scoring engine v3 (Location 30% / Bedrooms / Budget / Voucher).',
    files: ['src/components/admin/matchmaker/MatchCommandCenter.tsx'],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SUPABASE — DATABASE DOMAINS
// ─────────────────────────────────────────────────────────────────────
export const databaseNodes: SystemNode[] = [
  {
    id: 'db-auth-roles',
    label: 'Auth & Roles',
    layer: 'database',
    group: 'Identity',
    description: 'User identity, account roles, agency staff roles, access grants/requests.',
    tables: ['profiles', 'profiles_public', 'account_roles', 'account_role_permissions', 'agency_staff', 'access_requests', 'access_grants', 'admin_action_logs'],
  },
  {
    id: 'db-agency',
    label: 'Agency Domain',
    layer: 'database',
    group: 'Agency',
    description: 'Housing authorities and all PHA-scoped tables (vouchers, recerts, HAP, landlords, notices, etc.).',
    tables: ['housing_authorities', 'agency_offices', 'agency_vouchers', 'agency_hap_contracts', 'agency_recertifications', 'agency_landlords', 'agency_landlord_units', 'agency_notices_sent', 'agency_notice_templates', 'agency_messages', 'agency_payment_standards', 'agency_income_limits', 'agency_inspection_fees', 'agency_fss_participants', 'agency_fss_escrow', 'agency_hearings', 'agency_accommodations', 'agency_calendar_events', 'agency_documents', 'agency_audit_log', 'agency_activity_log'],
  },
  {
    id: 'db-tenant',
    label: 'Tenant Domain',
    layer: 'database',
    group: 'Tenant',
    description: 'Tenant profiles, applications, voucher applications, preferences, tenant ledger.',
    tables: ['tenant_profiles', 'voucher_applications', 'agency_tenant_ledger', 'tenant_*'],
  },
  {
    id: 'db-properties',
    label: 'Properties / Units',
    layer: 'database',
    group: 'Inventory',
    description: 'Properties, units, marketplace views, listings, photos.',
    tables: ['properties', 'property_units', 'properties_marketplace', 'property_units_marketplace'],
  },
  {
    id: 'db-matchmaker',
    label: 'Matchmaker',
    layer: 'database',
    group: 'Matching',
    description: 'Match queue, match scores, listing contracts, placements.',
    tables: ['match_queue', 'match_scores', 'listing_contracts', 'placement_fees'],
  },
  {
    id: 'db-payments',
    label: 'Payments / HAP',
    layer: 'database',
    group: 'Money',
    description: 'Stripe customers/subscriptions, HAP transactions, rent payments, payouts, Plaid links, Checkbook payouts.',
    tables: ['stripe_customers', 'subscriptions', 'rent_payments', 'hap_transactions', 'checkbook_payouts', 'plaid_items', 'placement_fee_payments'],
  },
  {
    id: 'db-messaging',
    label: 'Messaging',
    layer: 'database',
    group: 'Communications',
    description: 'Admin messages, agency messages, SMS conversations, email queue, notifications.',
    tables: ['admin_messages', 'agency_messages', 'admin_bulk_message_recipients', 'sms_conversations', 'email_queue', 'notifications'],
  },
  {
    id: 'db-content',
    label: 'Content / SEO',
    layer: 'database',
    group: 'Marketing',
    description: 'Blog posts, structured pages, SEO sitemap data, white-label sites.',
    tables: ['blog_posts', 'structured_pages', 'white_label_sites'],
  },
  {
    id: 'db-reporting',
    label: 'Reporting',
    layer: 'database',
    group: 'Analytics',
    description: 'Scheduled reports, SEMAP scores, HUD-50058 data, analytics events.',
    tables: ['agency_scheduled_reports', 'agency_semap_scores', 'analytics_events'],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SUPABASE — EDGE FUNCTIONS (grouped)
// ─────────────────────────────────────────────────────────────────────
export const edgeFunctionGroups: SystemNode[] = [
  {
    id: 'ef-auth',
    label: 'Auth & Invitations',
    layer: 'edge-function',
    group: 'Auth',
    description: 'User invitation, acceptance, password reset, system admin creation, impersonation.',
    files: ['accept-account-invitation', 'accept-asset-invitation', 'accept-invitation', 'accept-system-admin-invitation', 'send-account-invitation', 'send-system-admin-invitation', 'send-tenant-invitation', 'send-portfolio-invitation', 'send-asset-invitation', 'send-referral-invitation', 'resend-account-invitation', 'resend-invitation', 'send-password-reset', 'create-system-admin-direct', 'impersonate-user', 'admin-set-password', 'admin-user-operations', 'team-member-invitation', 'queue-signup', 'process-pending-signups'],
  },
  {
    id: 'ef-payments-stripe',
    label: 'Payments — Stripe',
    layer: 'edge-function',
    group: 'Payments',
    description: 'Stripe checkout, subscriptions, customer portal, autopay, webhooks.',
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    files: ['create-subscription-checkout', 'create-rent-checkout', 'create-rent-payment-intent', 'create-rent-payment', 'create-asset-payment-session', 'create-placement-fee-payment', 'create-background-check-payment', 'create-stripe-connect-account', 'admin-customer-portal', 'admin-cancel-subscription', 'admin-list-invoices', 'admin-list-all-invoices', 'admin-sync-plan-to-stripe', 'admin-sync-subscription', 'cancel-tenant-subscription-now', 'manage-subscription', 'sync-subscription-status', 'process-rent-autopay', 'process-subscription-autopay', 'process-subscription-cancellations', 'setup-rent-autopay', 'setup-subscription-autopay', 'setup-payment-method', 'setup-payment-method-checkout', 'setup-autopay-cron', 'confirm-payment-method', 'confirm-checkout-payment-method', 'confirm-rent-payment', 'confirm-asset-payment', 'expire-stripe-checkout', 'handle-autopay-setup-success', 'send-autopay-reminders', 'stripe-subscription-webhook', 'stripe-connect-webhook', 'placement-fee-webhook', 'record-manual-payment', 'record-placement-fee-payment', 'process-lease-signed-payment', 'test-stripe-connection'],
  },
  {
    id: 'ef-payments-checkbook',
    label: 'Payments — Checkbook (HAP)',
    layer: 'edge-function',
    group: 'Payments',
    description: 'Checkbook.io ACH/digital check disbursement for HAP payments.',
    secrets: ['CHECKBOOK_API_KEY', 'CHECKBOOK_API_SECRET'],
    files: ['checkbook-add-funding-source', 'checkbook-test', 'checkbook-webhook', 'create-checkbook-payout', 'process-bulk-payouts'],
  },
  {
    id: 'ef-payments-plaid',
    label: 'Payments — Plaid',
    layer: 'edge-function',
    group: 'Payments',
    description: 'Plaid bank linking, transaction sync, financial intelligence.',
    secrets: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
    files: ['plaid-financial-sync', 'plaid-hap-sync', 'plaid-payment-methods', 'plaid-webhook', 'sync-wallet-balances'],
  },
  {
    id: 'ef-comms-email',
    label: 'Communications — Email (Resend)',
    layer: 'edge-function',
    group: 'Communications',
    description: 'Transactional + bulk email delivery via Resend, custom domain verification.',
    secrets: ['RESEND_API_KEY'],
    files: ['send-admin-email', 'send-property-match-email', 'newsletter-welcome', 'process-email-queue', 'check-dns-status', 'domain-verification', 'reset-domain-verification', 'reverify-domain', 'verify-domain', 'verify-subdomain', 'save-domain-settings', 'white-label-email-notification'],
  },
  {
    id: 'ef-comms-sms',
    label: 'Communications — SMS (Quo / Twilio)',
    layer: 'edge-function',
    group: 'Communications',
    description: 'SMS delivery via Quo/OpenPhone (1 recipient max per req) and Twilio webhooks.',
    secrets: ['QUO_API_KEY', 'TWILIO_AUTH_TOKEN'],
    files: ['send-sms', 'send-revival-sms', 'blog-digest-sms', 'twilio-webhook'],
  },
  {
    id: 'ef-comms-push',
    label: 'Communications — Push',
    layer: 'edge-function',
    group: 'Communications',
    description: 'Browser/mobile push notifications and status alerts.',
    files: ['notify-push', 'push-status-alert', 'send-test-notification', 'maintenance-notifications'],
  },
  {
    id: 'ef-scraping',
    label: 'Scraping & Data Ingest',
    layer: 'edge-function',
    group: 'Data',
    description: 'Property listing scraping (Jina + Firecrawl fallback), apartment complexes, document AI parsing.',
    secrets: ['FIRECRAWL_API_KEY', 'JINA_API_KEY'],
    files: ['scrape-property-listing', 'scrape-apartment-complex', 'parse-document-ai', 'csv-import-processor', 'process-property-import', 'generate-property-import-template', 'process-property-addresses', 'process-property-for-sale', 'n8n-property-webhook'],
  },
  {
    id: 'ef-hud',
    label: 'HUD APIs',
    layer: 'edge-function',
    group: 'Government',
    description: 'HUD ArcGIS housing authority registry, intelligence, IRIS e-file, SEMAP.',
    files: ['import-housing-authorities', 'hud-intelligence-engine', 'iris-efile-submit', 'calculate-semap', 'generate-hap-forms'],
  },
  {
    id: 'ef-ai',
    label: 'AI Agents',
    layer: 'edge-function',
    group: 'AI',
    description: 'AI matchmaking, insights, expense categorization, content posting, scouting, briefing.',
    secrets: ['OPENAI_API_KEY', 'LOVABLE_API_KEY'],
    files: ['agent-briefing', 'agent-compliance-monitor', 'agent-content-poster', 'agent-matchmaker-api', 'agent-scout', 'ai-expense-categorization', 'ai-field-mapping', 'ai-insights-engine', 'ai-insights-refresh', 'ai-portfolio-optimizer', 'ai-predictive-maintenance', 'ai-tenant-communication', 'compute-match-queue', 'generate-seo-blog-post', 'research-blog-topic', 'translate-blog-post', 'trigger-blog-generation', 'n8n-blog-callback', 'generate-document', 'generate-advanced-reports', 'theme-generator', 'suggest-next-tasks', 'generate-subtasks'],
  },
  {
    id: 'ef-geocode',
    label: 'Geocoding & Maps',
    layer: 'edge-function',
    group: 'Location',
    description: 'Google Maps geocoding for addresses and service areas.',
    secrets: ['GOOGLE_MAPS_API_KEY'],
    files: ['geocode-address', 'geocode-area', 'backfill-coordinates'],
  },
  {
    id: 'ef-cron',
    label: 'Scheduled / Cron',
    layer: 'edge-function',
    group: 'Automation',
    description: 'pg_cron-triggered jobs: reminders, autopay, scheduled reports, market data, recerts.',
    files: ['agency-send-reminders', 'auto-recertification-scheduler', 'process-asset-reminders', 'process-asset-digest-reminders', 'process-scheduled-reports', 'reset-weekly-quotas', 'scheduled-auto-assign', 'scheduled-territory-backfill', 'evaluate-market-alerts', 'fetch-market-data', 'batch-market-data', 'fetch-exchange-rates', 'fetch-price-history', 'weekly-application-refresh-notify', 'alert-digest', 'setup-cron-jobs', 'portfolio-snapshotter', 'site-cache-invalidation', 'seo-sitemap-generator'],
  },
  {
    id: 'ef-admin',
    label: 'Admin Operations',
    layer: 'edge-function',
    group: 'Admin',
    description: 'Admin RBAC, transactions, vendor mgmt, security monitoring, backups, integrations.',
    files: ['admin-rbac', 'admin-hap-transactions', 'admin-rent-transactions', 'fetch-admin-transactions', 'manage-account-roles', 'manage-vendors', 'security-monitor', 'backup-manager', 'update-integration-secrets', 'system-map-scan'],
  },
  {
    id: 'ef-background-check',
    label: 'Background Checks',
    layer: 'edge-function',
    group: 'Verification',
    description: 'Background check processing, cancellation, retry.',
    files: ['background-check-processor', 'cancel-background-check', 'rerun-background-check'],
  },
  {
    id: 'ef-misc',
    label: 'Misc / Utilities',
    layer: 'edge-function',
    group: 'Utilities',
    description: 'API gateway, partner API, content API, analytics, public site renderer, etc.',
    files: ['api-gateway', 'partner-api', 'content-api', 'analytics-collector', 'analytics-tracker', 'public-site-renderer', 'custom-css-validator', 'webhook-handler', 'get-upload-urls', 'form-submission-processor', 'search-symbols', 'fetch-property-intelligence', 'fetch-financial-intelligence', 'unified-redemption', 'referral-analytics', 'referral-automation', 'referral-campaign-management', 'check-referral-milestones', 'award-portfolio-points', 'calculate-point-balance', 'log-rent-payment-points', 'tenant-auto-tag-rent', 'auto-assign-entities', 'bulk-import-tasks', 'create-enterprise-tenant', 'grant-portfolio-role', 'process-portfolio-events', 'schedule-maintenance', 'setup-demo-landlord', 'test-configuration', 'insert-test-maintenance-messages', 'blog-link-tracker', 'backfill-listing-contracts', 'backfill-lease-documents', 'backfill-lease-renewal-notification', 'backfill-placement-fee-payment', 'backfill-rent-points', 'backfill-tenant-territories'],
  },
];

// ─────────────────────────────────────────────────────────────────────
// EXTERNAL INTEGRATIONS
// ─────────────────────────────────────────────────────────────────────
export const externalNodes: SystemNode[] = [
  {
    id: 'ext-stripe',
    label: 'Stripe',
    layer: 'external',
    group: 'Payments',
    description: 'Subscriptions, rent collection, placement fees, Connect for landlord payouts.',
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    calledFrom: ['ef-payments-stripe'],
    url: 'https://dashboard.stripe.com',
  },
  {
    id: 'ext-checkbook',
    label: 'Checkbook.io',
    layer: 'external',
    group: 'Payments',
    description: 'ACH + digital check disbursement for HAP payments to landlords.',
    secrets: ['CHECKBOOK_API_KEY', 'CHECKBOOK_API_SECRET'],
    calledFrom: ['ef-payments-checkbook'],
    url: 'https://www.checkbook.io',
  },
  {
    id: 'ext-plaid',
    label: 'Plaid',
    layer: 'external',
    group: 'Payments',
    description: 'Bank account linking, transaction sync, balance verification.',
    secrets: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
    calledFrom: ['ef-payments-plaid'],
    url: 'https://dashboard.plaid.com',
  },
  {
    id: 'ext-resend',
    label: 'Resend',
    layer: 'external',
    group: 'Communications',
    description: 'Transactional + bulk email. Custom domain support per agency.',
    secrets: ['RESEND_API_KEY'],
    calledFrom: ['ef-comms-email'],
    url: 'https://resend.com/dashboard',
  },
  {
    id: 'ext-quo',
    label: 'Quo / OpenPhone',
    layer: 'external',
    group: 'Communications',
    description: 'SMS delivery. Constraint: max 1 recipient per request.',
    secrets: ['QUO_API_KEY'],
    calledFrom: ['ef-comms-sms'],
    url: 'https://www.openphone.com',
  },
  {
    id: 'ext-twilio',
    label: 'Twilio',
    layer: 'external',
    group: 'Communications',
    description: 'Inbound SMS webhook handling.',
    secrets: ['TWILIO_AUTH_TOKEN'],
    calledFrom: ['ef-comms-sms'],
    url: 'https://console.twilio.com',
  },
  {
    id: 'ext-hud',
    label: 'HUD ArcGIS REST API',
    layer: 'external',
    group: 'Government',
    description: '~3,540 housing authorities. Public — no key required.',
    calledFrom: ['ef-hud'],
    url: 'https://hudgis-hud.opendata.arcgis.com',
  },
  {
    id: 'ext-jina',
    label: 'Jina Reader',
    layer: 'external',
    group: 'Data',
    description: 'Primary URL→markdown scraper for property listings (free tier).',
    calledFrom: ['ef-scraping'],
    url: 'https://jina.ai/reader',
  },
  {
    id: 'ext-firecrawl',
    label: 'Firecrawl',
    layer: 'external',
    group: 'Data',
    description: 'Fallback scraper when Jina fails. Used by scrape-property-listing.',
    secrets: ['FIRECRAWL_API_KEY'],
    calledFrom: ['ef-scraping'],
    url: 'https://www.firecrawl.dev',
  },
  {
    id: 'ext-google-maps',
    label: 'Google Maps',
    layer: 'external',
    group: 'Location',
    description: 'Geocoding addresses → lat/lng for matching radius.',
    secrets: ['GOOGLE_MAPS_API_KEY'],
    calledFrom: ['ef-geocode'],
    url: 'https://console.cloud.google.com/google/maps-apis',
  },
  {
    id: 'ext-openai',
    label: 'OpenAI / Lovable AI Gateway',
    layer: 'external',
    group: 'AI',
    description: 'LLM calls for matchmaking, insights, content gen, document parsing.',
    secrets: ['OPENAI_API_KEY', 'LOVABLE_API_KEY'],
    calledFrom: ['ef-ai'],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SUPABASE INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────
export const infraNodes: SystemNode[] = [
  {
    id: 'sb-auth',
    label: 'Supabase Auth',
    layer: 'auth',
    group: 'Infra',
    description: 'JWT-based auth. handle_new_user trigger maps signup metadata → profiles.',
  },
  {
    id: 'sb-storage',
    label: 'Supabase Storage',
    layer: 'storage',
    group: 'Infra',
    description: 'Buckets: documents, inspection-photos, property-images, avatars. Path-based folder ownership RLS.',
  },
  {
    id: 'sb-cron',
    label: 'pg_cron',
    layer: 'cron',
    group: 'Infra',
    description: 'Postgres-scheduled jobs invoking edge functions on cadence.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// EDGES (relationships)
// ─────────────────────────────────────────────────────────────────────
export const systemEdges: SystemEdge[] = [
  // Frontend → Supabase
  { id: 'e-admin-db', source: 'fe-admin', target: 'db-auth-roles', label: 'reads/writes' },
  { id: 'e-admin-ef', source: 'fe-admin', target: 'ef-admin', label: 'invokes' },
  { id: 'e-agency-db', source: 'fe-agency', target: 'db-agency', label: 'reads/writes' },
  { id: 'e-landlord-db', source: 'fe-landlord', target: 'db-properties', label: 'reads/writes' },
  { id: 'e-tenant-db', source: 'fe-tenant', target: 'db-tenant', label: 'reads/writes' },
  { id: 'e-matchmaker-db', source: 'fe-matchmaker', target: 'db-matchmaker', label: 'reads/writes' },

  // Edge functions → External
  { id: 'e-ef-stripe', source: 'ef-payments-stripe', target: 'ext-stripe' },
  { id: 'e-ef-checkbook', source: 'ef-payments-checkbook', target: 'ext-checkbook' },
  { id: 'e-ef-plaid', source: 'ef-payments-plaid', target: 'ext-plaid' },
  { id: 'e-ef-resend', source: 'ef-comms-email', target: 'ext-resend' },
  { id: 'e-ef-quo', source: 'ef-comms-sms', target: 'ext-quo' },
  { id: 'e-ef-twilio', source: 'ef-comms-sms', target: 'ext-twilio' },
  { id: 'e-ef-hud', source: 'ef-hud', target: 'ext-hud' },
  { id: 'e-ef-jina', source: 'ef-scraping', target: 'ext-jina' },
  { id: 'e-ef-firecrawl', source: 'ef-scraping', target: 'ext-firecrawl' },
  { id: 'e-ef-gmaps', source: 'ef-geocode', target: 'ext-google-maps' },
  { id: 'e-ef-ai', source: 'ef-ai', target: 'ext-openai' },

  // Cron → edge functions
  { id: 'e-cron-reminders', source: 'sb-cron', target: 'ef-cron' },

  // Auth
  { id: 'e-auth-roles', source: 'sb-auth', target: 'db-auth-roles' },
];

// ─────────────────────────────────────────────────────────────────────
// KEY WORKFLOWS
// ─────────────────────────────────────────────────────────────────────
export const workflows: SystemWorkflow[] = [
  {
    id: 'wf-tenant-signup-match',
    name: 'Tenant Signup → Match → Application',
    description: 'New tenant signs up, profile is enriched, matchmaker scores property fits, tenant applies.',
    steps: ['fe-tenant', 'sb-auth', 'db-tenant', 'ef-ai', 'db-matchmaker', 'fe-matchmaker'],
  },
  {
    id: 'wf-rfta-hap',
    name: 'RFTA → Inspection → HAP Contract → Disbursement',
    description: 'Landlord submits RFTA, agency inspects, HAP contract is signed, monthly payments disburse via Checkbook.',
    steps: ['fe-landlord', 'db-properties', 'fe-agency', 'db-agency', 'ef-payments-checkbook', 'ext-checkbook'],
  },
  {
    id: 'wf-staff-invite',
    name: 'Agency Staff Invite → Role → Portal Access',
    description: 'Agency admin invites staff, recipient accepts, role is assigned, portal access gated by has_role().',
    steps: ['fe-agency', 'ef-auth', 'sb-auth', 'db-auth-roles', 'fe-agency'],
  },
  {
    id: 'wf-bulk-notice',
    name: 'Bulk Notice Pipeline',
    description: 'Agency selects recipients, picks template, queue → Resend (email) and/or Quo (SMS).',
    steps: ['fe-agency', 'db-messaging', 'ef-comms-email', 'ext-resend'],
  },
  {
    id: 'wf-50058',
    name: 'HUD-50058 Report Generation',
    description: 'Scheduled report → assemble tenant + voucher + HAP data → fixed-width .txt for HUD PIC submission.',
    steps: ['sb-cron', 'ef-cron', 'db-agency', 'db-reporting', 'ef-hud'],
  },
];

// ─────────────────────────────────────────────────────────────────────
// AGGREGATED EXPORT
// ─────────────────────────────────────────────────────────────────────
export const allNodes: SystemNode[] = [
  ...frontendNodes,
  ...databaseNodes,
  ...edgeFunctionGroups,
  ...externalNodes,
  ...infraNodes,
];

export const ARCHITECTURE_VERSION = '1.0.0';
export const ARCHITECTURE_LAST_UPDATED = '2026-04-16';
