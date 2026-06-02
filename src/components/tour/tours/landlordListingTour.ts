import { Step } from 'react-joyride';

// Listing-mode tour: a focused 8-step walkthrough for landlords who only
// want to post units and get matched. No PM features (Analytics, Maintenance,
// Payments, Lease Mgmt) are referenced.
export interface ListingTourStep extends Step {
  page: 'portfolio' | 'dashboard';
}

export const listingTourSteps: ListingTourStep[] = [
  // ===== PORTFOLIO SELECT (0-2) =====
  {
    target: 'body',
    content:
      "Welcome to OpenKey! In about a minute we'll show you how to list a unit and start matching with tenants.",
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to OpenKey',
    page: 'portfolio',
  },
  {
    target: '[data-tour="everything-card"]',
    content:
      "This is your home base. Every unit you list will show up here so you can track them in one place.",
    placement: 'right',
    disableBeacon: true,
    title: 'Your listings, all in one place',
    page: 'portfolio',
  },
  {
    target: '[data-tour="everything-view-btn"]',
    content: "Click View to open your dashboard and start posting your first unit.",
    placement: 'top',
    disableBeacon: true,
    title: 'Open your dashboard',
    page: 'portfolio',
  },

  // ===== DASHBOARD (3-7) =====
  {
    target: '[data-tour="dashboard-metrics"]',
    content:
      "Your at-a-glance numbers: how many units you have listed, how many matches came in, and applications waiting on you.",
    placement: 'bottom',
    disableBeacon: true,
    title: 'Listing overview',
    page: 'dashboard',
  },
  {
    target: '[data-tour="quick-actions"]',
    content:
      "One-click shortcuts. Add Property is the big one — that's how you post a new unit.",
    placement: 'left',
    disableBeacon: true,
    title: 'Quick actions',
    page: 'dashboard',
  },
  {
    target: '[data-tour="tab-properties"]',
    content:
      "All your listed properties live here. Add new ones, edit them, or mark them on-market to start receiving applications.",
    placement: 'bottom',
    disableBeacon: true,
    title: 'Properties',
    page: 'dashboard',
  },
  {
    target: 'body',
    content:
      "When you mark a property 'on market,' it gets shown to verified affordable-housing tenants (Section 8 voucher holders and low-income renters) searching in your area. That's what kicks off matching.",
    placement: 'center',
    disableBeacon: true,
    title: 'On-market = visible to tenants',
    page: 'dashboard',
  },
  {
    target: '[data-tour="tab-tenants-applications"]',
    content:
      "Applications and tenant matches show up here. Review profiles, approve, decline — your whole pipeline. You're all set!",
    placement: 'bottom',
    disableBeacon: true,
    title: 'Tenants & Applications',
    page: 'dashboard',
  },
];

export const LISTING_TOTAL_STEPS = listingTourSteps.length; // 8
export const LISTING_DASHBOARD_OFFSET = 3; // first 3 are portfolio

// Listing tour has no sub-tab logic — only top-level Properties + Tenants/Applications
export const LISTING_STEP_TAB_REQUIREMENTS: Record<number, string> = {
  5: 'Properties',
  6: 'Properties',
  7: 'Tenants/Applications',
};
