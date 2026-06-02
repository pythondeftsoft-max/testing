import { Step } from 'react-joyride';

// Extended Step type with page info
export interface TourStep extends Step {
  page: 'portfolio' | 'dashboard';
}

// All tour steps with GLOBAL indices 0-27 (Steps 1-28)
// Analytics has 4 individual sub-tab steps
export const allTourSteps: TourStep[] = [
  // ========== PORTFOLIO SELECT STEPS (0-4) ==========
  // Step 0 (Step 1 in UI)
  {
    target: 'body',
    content: "Welcome! In 60 seconds, we'll show you how to track rent, manage maintenance, and monitor your entire portfolio from one dashboard.",
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to OpenKey!',
    page: 'portfolio',
  },
  // Step 1 (Step 2 in UI)
  {
    target: '[data-tour="everything-card"]',
    content: 'Your command center. View combined data from all portfolios in your profile - occupancy, rent collected, and cash flow in one unified view.',
    placement: 'right',
    disableBeacon: true,
    title: 'Everything Portfolio',
    page: 'portfolio',
  },
  // Step 2 (Step 3 in UI)
  {
    target: '[data-tour="portfolio-card"]',
    content: 'Drill down into specific buildings or property groups. Ideal for owners with different partners, assets in different classes, or properties across countries. Invite collaborators with custom access levels.',
    placement: 'right',
    disableBeacon: true,
    title: 'Individual Portfolios',
    page: 'portfolio',
  },
  // Step 3 (Step 4 in UI)
  {
    target: '[data-tour="portfolio-settings-btn"]',
    content: 'Access portfolio settings here. Manage your team, invite collaborators with custom permissions, configure points distribution, and view detailed reports.',
    placement: 'top',
    disableBeacon: true,
    title: 'Portfolio Settings',
    page: 'portfolio',
  },
  // Step 4 (Step 5 in UI)
  {
    target: '[data-tour="everything-view-btn"]',
    content: "Let's see it in action! Click the View button to open your full dashboard.",
    placement: 'top',
    disableBeacon: true,
    title: 'Continue to Dashboard',
    page: 'portfolio',
  },

  // ========== DASHBOARD STEPS (5-27) ==========
  // Step 5 (Step 6 in UI): Portfolio Selector
  {
    target: '[data-tour="portfolio-selector"]',
    content: 'Jump between portfolios instantly. Filter your entire dashboard to show just the properties you want to focus on.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Switch Portfolios',
    page: 'dashboard',
  },
  // Step 6 (Step 7 in UI): Dashboard Metrics
  {
    target: '[data-tour="dashboard-metrics"]',
    content: 'Your key performance indicators at a glance. Total units, occupancy rates, monthly rent collected, and net operating income.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Dashboard Metrics',
    page: 'dashboard',
  },
  // Step 7 (Step 8 in UI): Activity Feed
  {
    target: '[data-tour="activity-feed"]',
    content: 'Stay informed with real-time updates. See recent payments, maintenance requests, lease activity, and points earned.',
    placement: 'top',
    disableBeacon: true,
    title: 'Recent Activity',
    page: 'dashboard',
  },
  // Step 8 (Step 9 in UI): Quick Actions
  {
    target: '[data-tour="quick-actions"]',
    content: 'Common tasks one click away. Add properties, manage team roles, or review pending applications.',
    placement: 'left',
    disableBeacon: true,
    title: 'Quick Actions',
    page: 'dashboard',
  },
  // Step 9 (Step 10 in UI): Analytics Tab Button
  {
    target: '[data-tour="tab-analytics"]',
    content: "Let's explore Analytics - your data powerhouse for tracking portfolio performance.",
    placement: 'bottom',
    disableBeacon: true,
    title: 'Analytics Tab',
    page: 'dashboard',
  },
  // Step 10 (Step 11 in UI): Custom Overview Sub-tab
  {
    target: '[data-tour="analytics-custom-overview"]',
    content: 'Build your personalized dashboard. Drag and drop widgets, track the metrics that matter most to you.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Custom Overview',
    page: 'dashboard',
  },
  // Step 11 (Step 12 in UI): AI Forecast Sub-tab
  {
    target: '[data-tour="analytics-ai-forecast"]',
    content: 'AI-powered predictions and portfolio health scores. See vacancy risk, renewal probability, and cash flow forecasts.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'AI Forecast & Health',
    page: 'dashboard',
  },
  // Step 12 (Step 13 in UI): Property Analytics Sub-tab
  {
    target: '[data-tour="analytics-property"]',
    content: 'Deep dive into individual property performance. Compare properties, analyze trends, and spot opportunities.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Property Analytics',
    page: 'dashboard',
  },
  // Step 13 (Step 14 in UI): Assets Sub-tab
  {
    target: '[data-tour="analytics-assets"]',
    content: 'Track your complete net worth - stocks, crypto, and other investments alongside your real estate holdings.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Assets & Net Worth',
    page: 'dashboard',
  },
  // Step 14 (Step 15 in UI): Lease Expirations Tab
  {
    target: '[data-tour="tab-lease-expirations"]',
    content: 'Track lease renewals and expirations here. Once a lease is active, configure section 8 and tenant portions for HCV properties.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Lease Management',
    page: 'dashboard',
  },
  // Step 15 (Step 16 in UI): Properties Tab
  {
    target: '[data-tour="tab-properties"]',
    content: 'Your real estate roster. View all properties across this portfolio with quick access to details.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Properties',
    page: 'dashboard',
  },
// Step 16 (Step 17 in UI): Add Properties - centered modal
  {
    target: 'body',
    content: "Add any property type — single family, multi-family, commercial, hotels, marinas, warehouses. Select your country, start typing the address, and we'll auto-locate it on the map.",
    placement: 'center',
    disableBeacon: true,
    title: 'Add Properties',
    page: 'dashboard',
  },
  // Step 17 (Step 18 in UI): On-Market Listings Info - centered modal
  {
    target: 'body',
    content: "When you mark a property 'on market,' it's listed for verified US-based affordable-housing tenants (Section 8 voucher holders and low-income renters). Best for US residential properties open to HCV and income-qualified applicants.",
    placement: 'center',
    disableBeacon: true,
    title: 'On-Market Listings',
    page: 'dashboard',
  },
  // Step 18 (Step 19 in UI): Maintenance Tab
  {
    target: '[data-tour="tab-maintenance"]',
    content: 'Your maintenance command center. Track tickets, manage vendors, schedule appointments, and keep complete repair history.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Maintenance',
    page: 'dashboard',
  },
  // Step 19 (Step 20 in UI): Payments Tab - Overview
  {
    target: '[data-tour="tab-payments"]',
    content: 'Track all incoming rent and Section 8 payments — whether collected through OpenKey or externally. Start with the Overview for collection health.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Payments',
    page: 'dashboard',
  },
  // Step 20 (Step 21 in UI): All Incoming Tab
  {
    target: '[data-tour="payments-tab-all-incoming"]',
    content: 'View every payment received — tenant rent and Section 8 vouchers. Filter by date, type, or status.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'All Incoming Payments',
    page: 'dashboard',
  },
  // Step 21 (Step 22 in UI): Record a Payment Button
  {
    target: '[data-tour="record-payment-btn"]',
    content: 'Manually record payments received outside OpenKey - cash, check, or other methods.',
    placement: 'left',
    disableBeacon: true,
    title: 'Record a Payment',
    page: 'dashboard',
  },
  // Step 22 (Step 23 in UI): Payment Tagging Tab
  {
    target: '[data-tour="payments-tab-tagging"]',
    content: 'Connect your bank via Plaid to automatically track deposits. Tag bank transactions to specific properties for accurate rent tracking.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Payment Tagging',
    page: 'dashboard',
  },
  // Step 23 (Step 24 in UI): Untagged Properties
  {
    target: '[data-tour="tagging-untagged-tab"]',
    content: 'Not using Stripe? Tag external payments here — checks, bank deposits, Section 8 vouchers — so you can track them alongside Stripe payments.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Untagged Properties',
    page: 'dashboard',
  },
  // Step 24 (Step 25 in UI): Tagged & Tracked
  {
    target: '[data-tour="tagging-tagged-tab"]',
    content: 'View all tracked deposits with allocation details. See how much of each payment is assigned to properties and what remains unallocated.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Tagged & Tracked',
    page: 'dashboard',
  },
  // Step 25 (Step 26 in UI): Sync Payment Records Button
  {
    target: '[data-tour="sync-payment-records-btn"]',
    content: 'Sync tagged payments to the All Incoming view. This ensures your payment records stay accurate across views.',
    placement: 'left',
    disableBeacon: true,
    title: 'Sync Payment Records',
    page: 'dashboard',
  },
  // Step 26 (Step 27 in UI): Track Payment Button
  {
    target: '[data-tour="track-payment-btn"]',
    content: 'Manually track a bank deposit or external payment. Add descriptions, amounts, and allocate to specific properties.',
    placement: 'left',
    disableBeacon: true,
    title: 'Track Payment',
    page: 'dashboard',
  },
  // Step 27 (Step 28 in UI): Auto-Tag Rules
  {
    target: '[data-tour="tagging-rules-tab"]',
    content: 'Set up automatic tagging rules. When a deposit matches your criteria, it gets tagged to the right property automatically.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Auto-Tag Rules',
    page: 'dashboard',
  },
  // Step 28 (Step 29 in UI): Tenants & Applications - FINAL STEP
  {
    target: '[data-tour="tab-tenants-applications"]',
    content: "Screen applicants, review documents, approve or decline. Manage your entire tenant pipeline from application to move-in. You're all set!",
    placement: 'bottom',
    disableBeacon: true,
    title: 'Tenants & Applications',
    page: 'dashboard',
  },
];

// Tab requirements for auto-navigation - uses GLOBAL step indices (0-28)
// Maps global step index to required main tab
export const STEP_TAB_REQUIREMENTS: Record<number, string> = {
  // Steps 10-13: Analytics sub-tabs - needs Analytics tab
  10: 'Analytics',
  11: 'Analytics',
  12: 'Analytics',
  13: 'Analytics',
  // Step 14: Lease Expirations tab button - needs Lease Expirations tab
  14: 'Lease Expirations',
  // Step 15-17: Properties - needs Properties tab
  15: 'Properties',
  16: 'Properties',
  17: 'Properties',
  // Step 18: Maintenance - needs Maintenance tab
  18: 'Maintenance',
  // Steps 19-27: Payments - needs Payments tab
  19: 'Payments',
  20: 'Payments',
  21: 'Payments',
  22: 'Payments',
  23: 'Payments',
  24: 'Payments',
  25: 'Payments',
  26: 'Payments',
  27: 'Payments',
  // Step 28: Tenants/Applications tab - needs that tab
  28: 'Tenants/Applications',
};

// Sub-tab requirements for Payments section - maps global step to sub-tab selector
export const STEP_SUBTAB_REQUIREMENTS: Record<number, string> = {
  // Step 19: Payments Overview - stays on overview (default)
  19: '[data-tour="payments-tab-overview"]',
  // Step 20-21: All Incoming tab
  20: '[data-tour="payments-tab-all-incoming"]',
  21: '[data-tour="payments-tab-all-incoming"]',
  // Steps 22-27: Payment Tagging tab
  22: '[data-tour="payments-tab-tagging"]',
  23: '[data-tour="payments-tab-tagging"]',
  24: '[data-tour="payments-tab-tagging"]',
  25: '[data-tour="payments-tab-tagging"]',
  26: '[data-tour="payments-tab-tagging"]',
  27: '[data-tour="payments-tab-tagging"]',
};

// Inner Payment Tagging tab requirements - maps global step to inner tab value
export const STEP_TAGGING_TAB_REQUIREMENTS: Record<number, 'untagged' | 'tagged' | 'rules'> = {
  23: 'untagged',  // Untagged Properties step
  24: 'tagged',    // Tagged & Tracked step
  25: 'tagged',    // Sync Payment Records (stays on tagged view)
  26: 'tagged',    // Track Payment (stays on tagged view)
  27: 'rules',     // Auto-Tag Rules step
};

// Total steps and offset for backward compatibility
export const TOTAL_TOUR_STEPS = allTourSteps.length; // 29 (indices 0-28)
export const DASHBOARD_STEP_OFFSET = 5; // First 5 steps are portfolio

// Helper to get steps for a specific page
export const getStepsForPage = (page: 'portfolio' | 'dashboard'): TourStep[] => {
  return allTourSteps.filter(step => step.page === page);
};

// Legacy exports for backward compatibility
export const portfolioSelectSteps = getStepsForPage('portfolio');
export const dashboardSteps = getStepsForPage('dashboard');
