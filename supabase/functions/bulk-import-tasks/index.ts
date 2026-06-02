import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const tasks = [
      // UI/UX Polish & Fixes
      {
        title: "Fix property analytics spacing",
        description: "Add space between words in the property analytics header section to improve readability",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "30 minutes",
        source: "CSV Import",
        ai_reasoning: "Quick CSS fix - high visibility, low effort. Should be completed before V1 launch for professional appearance.",
        created_by: user.id
      },
      {
        title: "Update filter behavior for breakout pages",
        description: "For each breakout page, update the filter to auto-select units and include dropdown for multi-units",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 hours",
        source: "CSV Import",
        ai_reasoning: "Improves UX by setting intelligent defaults. Requires state management updates in filter components.",
        created_by: user.id
      },
      {
        title: "Remove additional filter breakdown display",
        description: "When making filter changes, the breakdown of additional filters shouldn't be displayed to reduce clutter",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 hours",
        source: "CSV Import",
        ai_reasoning: "UX polish - reduces visual noise. Affects filter components and state display logic.",
        created_by: user.id
      },
      {
        title: "Widget management - default 4-8 visible widgets",
        description: "Configure analytics widget management to show only 4-8 widgets by default per category, with user ability to customize visibility",
        category: "Feature",
        priority: "Medium",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Widget visibility management exists with useWidgetVisibility hook and GenerateMoreWidgetsButton component.",
        created_by: user.id
      },
      {
        title: "Standardize widget card sizes",
        description: "Make all widget cards the same size except for charts to create visual consistency",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 hours",
        source: "CSV Import",
        ai_reasoning: "CSS/layout adjustment across multiple widget components. Requires reviewing all widget implementations.",
        created_by: user.id
      },
      {
        title: "Reorganize properties tab below breakouts",
        description: "Determine and implement the best structure for properties tab content below the breakout sections",
        category: "Enhancement",
        priority: "Low",
        status: "Backlog",
        estimated_time: "4 hours",
        source: "CSV Import",
        ai_reasoning: "Requires UX decision and layout restructuring. Medium complexity depending on final design.",
        created_by: user.id
      },
      {
        title: "Combine favorites and custom dash in overview tab",
        description: "On the custom overview tab, consolidate favorites and custom dashboard into a single unified view",
        category: "Feature",
        priority: "High",
        status: "In Progress",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Favorites exist, needs consolidation logic. Requires data merging and new component layout.",
        created_by: user.id
      },
      {
        title: "Portfolio health strategy planning",
        description: "Define and document the complete strategy for portfolio health features and implementation approach",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "4 hours",
        source: "CSV Import",
        ai_reasoning: "Strategic planning task - creates foundation for multiple related features. Critical for V1 direction.",
        created_by: user.id
      },
      {
        title: "Integrate predictive analytics into portfolio health",
        description: "Combine predictive analytics from properties tab with portfolio health dashboard plus additional metrics",
        category: "Feature",
        priority: "Medium",
        status: "In Progress",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Portfolio health exists, predictive analytics partially implemented. Needs integration layer.",
        created_by: user.id
      },
      {
        title: "Reorganize content below gov programs",
        description: "Move appropriate content from below government programs section to portfolio health or determine new location",
        category: "Enhancement",
        priority: "Low",
        status: "Backlog",
        estimated_time: "3 hours",
        source: "CSV Import",
        ai_reasoning: "Content reorganization - depends on portfolio health strategy. Lower priority polish item.",
        created_by: user.id
      },
      {
        title: "Add AI Gemini to market analytics",
        description: "Integrate Google Gemini AI capabilities into the market analytics section for enhanced insights",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - requires API integration, prompt engineering, and UI design. Complex integration.",
        created_by: user.id
      },
      {
        title: "Remove activity page from analytics",
        description: "Remove the activity page from the analytics sub-tab navigation bar",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "5 minutes",
        source: "CSV Import",
        ai_reasoning: "Quick navigation cleanup - remove unused tab. Very simple change, high visibility.",
        created_by: user.id
      },
      {
        title: "Fix rewards store alignment",
        description: "Correct the alignment of reward amounts in the rewards store for visual consistency",
        category: "Bug Fix",
        priority: "High",
        status: "Backlog",
        estimated_time: "15 minutes",
        source: "CSV Import",
        ai_reasoning: "CSS alignment fix - quick polish item with high user visibility.",
        created_by: user.id
      },
      {
        title: "Points conversion validation",
        description: "Ensure users can only convert points they have actually earned, not pending or future points",
        category: "Bug Fix",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "2 hours",
        source: "CSV Import",
        ai_reasoning: "Data integrity issue - prevents point fraud. Requires validation logic in conversion flow.",
        created_by: user.id
      },
      {
        title: "Standardize portfolio analytics features",
        description: "Ensure all portfolios have the same analytics and report features. Only 'Everything' view needs multi-portfolio selector",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "4 hours",
        source: "CSV Import",
        ai_reasoning: "Feature consistency across views - requires reviewing portfolio analytics implementation.",
        created_by: user.id
      },
      {
        title: "Update home page carousel images",
        description: "Correct carousel images and information on the home page with accurate Caracal content",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 hour",
        source: "CSV Import",
        ai_reasoning: "Content update - requires new images and copy. Important for first impression.",
        created_by: user.id
      },
      {
        title: "Complete tenant onboarding form",
        description: "Ensure tenant onboarding form captures all information required by landlords and the platform",
        category: "Feature",
        priority: "Critical",
        status: "In Progress",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - tenant onboarding exists but may need additional fields. Blocks tenant flow.",
        created_by: user.id
      },
      {
        title: "Complete landlord property listing onboarding",
        description: "Ensure landlord onboarding includes all necessary fields and steps for property listings",
        category: "Feature",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - landlord onboarding flow needs to be comprehensive. Blocks landlord adoption.",
        created_by: user.id
      },
      {
        title: "Property card alignment and consistency",
        description: "Fix alignment issues across all property cards to ensure visual consistency throughout the application",
        category: "Bug Fix",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 hours",
        source: "CSV Import",
        ai_reasoning: "Layout consistency issue - affects multiple pages. CSS adjustments across card components.",
        created_by: user.id
      },
      {
        title: "Quick actions layout to 2 columns",
        description: "Update quick actions layout from current format to 2-column grid for better space utilization",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "30 minutes",
        source: "CSV Import",
        ai_reasoning: "Simple layout change - improves visual hierarchy. Quick CSS grid modification.",
        created_by: user.id
      },
      {
        title: "Update footer with real contact information",
        description: "Replace placeholder footer content with actual business contact information and support details",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "30 minutes",
        source: "CSV Import",
        ai_reasoning: "Professional appearance - simple content update. Important for credibility.",
        created_by: user.id
      },

      // Admin & Security
      {
        title: "Create worker console for Filipino workers",
        description: "Build a separate admin interface with limited permissions for outsourced workers. Should allow property sourcing and team collaboration without access to sensitive financial data or profit margins.",
        category: "Feature",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 if using outsourced labor. Requires: new role system, permission boundaries, UI dashboard, audit logging. High complexity but essential for operational security.",
        created_by: user.id
      },
      {
        title: "Admin property management access",
        description: "Enable admin users to add, edit, and manage properties for any user account in the system",
        category: "Feature",
        priority: "Critical",
        status: "In Progress",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Partially implemented - admin can view properties but editing is limited. Critical for V1 support.",
        created_by: user.id
      },
      {
        title: "Admin property viewing and editing",
        description: "Allow admin users to view and edit all properties with full access to property details and settings",
        category: "Feature",
        priority: "Critical",
        status: "In Progress",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Basic viewing exists, full editing needs implementation. Critical for admin support capabilities.",
        created_by: user.id
      },
      {
        title: "Permission explorer and inspector",
        description: "Create a comprehensive permission explorer tool for admins to view, test, and debug user permissions",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Advanced admin tooling - helpful for debugging but not critical for V1. V2 feature.",
        created_by: user.id
      },
      {
        title: "Advanced audit logging system",
        description: "Implement comprehensive audit logging for all sensitive operations including property changes, permission updates, and financial transactions",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Security and compliance feature - important for enterprise. Basic logging exists, needs enhancement.",
        created_by: user.id
      },
      {
        title: "Bulk simulation tools",
        description: "Create tools for admins to simulate bulk operations like property imports, tenant migrations, and payment processing",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 admin tooling - useful for testing and data migration but not critical for launch.",
        created_by: user.id
      },
      {
        title: "Enterprise security upgrades",
        description: "Implement enterprise-level security features including 2FA, IP whitelisting, and advanced session management",
        category: "Infrastructure",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - important for enterprise customers but not required for initial launch.",
        created_by: user.id
      },

      // Property Management
      {
        title: "Multi-unit dropdown totals",
        description: "Add total calculations and summaries in multi-unit dropdown selections for properties",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "4 hours",
        source: "CSV Import",
        ai_reasoning: "UX enhancement for multi-unit properties - helps users see aggregate data quickly.",
        created_by: user.id
      },
      {
        title: "Property geo-location auto-fill",
        description: "Implement automatic geo-location lookup and form auto-fill when users enter a property address",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Major UX improvement - reduces data entry errors. Requires geocoding API integration.",
        created_by: user.id
      },
      {
        title: "Admin property import functionality",
        description: "Build admin interface to import properties in bulk for any user account via CSV or spreadsheet",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for admin efficiency and onboarding large landlords. Complex but high value.",
        created_by: user.id
      },
      {
        title: "Property breakout page navigation",
        description: "Improve navigation and structure of individual property breakout/detail pages",
        category: "Enhancement",
        priority: "Medium",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Property breakout pages exist with navigation structure.",
        created_by: user.id
      },
      {
        title: "Multi-unit property improvements",
        description: "Enhance multi-unit property management with better unit organization, filtering, and display",
        category: "Enhancement",
        priority: "Medium",
        status: "In Progress",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Basic multi-unit support exists, needs UX polish and additional features.",
        created_by: user.id
      },
      {
        title: "Bulk property reports and exports",
        description: "Create comprehensive bulk export functionality for properties, financials, and tenant data",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - useful for data portability but not critical for initial launch.",
        created_by: user.id
      },

      // Financial & Payments
      {
        title: "Payment attachment to properties",
        description: "Ensure rent payments and other financial transactions are properly attached and tracked at the property level",
        category: "Feature",
        priority: "Critical",
        status: "In Progress",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - payment system exists but property association needs verification and potential fixes.",
        created_by: user.id
      },
      {
        title: "Vendor payment approval workflow",
        description: "Create approval workflow for vendor payments including review, authorization, and processing steps",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Payment recording exists but approval workflow is new. Important for financial controls.",
        created_by: user.id
      },
      {
        title: "Points distribution to multiple landlords",
        description: "Implement logic to distribute earned points across multiple landlords based on configurable rules",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Complex business logic - points earning exists but distribution to multiple recipients is new.",
        created_by: user.id
      },
      {
        title: "Set default points amounts",
        description: "Configure default point values for various actions and transactions throughout the platform",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 hour",
        source: "CSV Import",
        ai_reasoning: "Business configuration - simple but important for consistent point economy.",
        created_by: user.id
      },
      {
        title: "Stripe integration verification",
        description: "Comprehensive testing and verification of all Stripe payment integration touchpoints",
        category: "Infrastructure",
        priority: "Critical",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Stripe integration exists and is functional.",
        created_by: user.id
      },
      {
        title: "Maintenance cost workflow",
        description: "Create workflow for tracking, approving, and recording maintenance costs for properties",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Maintenance requests exist, cost tracking workflow is new. Important for property management.",
        created_by: user.id
      },
      {
        title: "W-9/1099 advanced features",
        description: "Implement advanced W-9 collection and 1099 generation features for vendor and contractor payments",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - important for tax compliance but not required for initial launch.",
        created_by: user.id
      },
      {
        title: "PM/Worker commission system",
        description: "Build commission calculation and tracking system for property managers and workers",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - complex business logic not required for V1.",
        created_by: user.id
      },

      // Tenant Features
      {
        title: "Combine applied and saved homes",
        description: "Merge the 'Applied Homes' and 'Saved Homes' sections into a single unified view with status indicators",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "4 hours",
        source: "CSV Import",
        ai_reasoning: "UX improvement - reduces navigation complexity. Both features exist, needs consolidation.",
        created_by: user.id
      },
      {
        title: "Property search map functionality",
        description: "Fix and enhance the map-based property search functionality for tenants",
        category: "Bug Fix",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Critical tenant feature - map search exists but may have issues. High priority for V1.",
        created_by: user.id
      },
      {
        title: "Tenant application workflow",
        description: "Complete and test the full tenant application submission and tracking workflow",
        category: "Feature",
        priority: "Critical",
        status: "In Progress",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Core tenant feature - partially implemented, needs completion for V1 launch.",
        created_by: user.id
      },
      {
        title: "Tenant lease renewal emails",
        description: "Implement automated email notifications for upcoming lease renewals with action options",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Important retention feature - requires email templates and scheduling logic.",
        created_by: user.id
      },
      {
        title: "Tenant lease tracking",
        description: "Create comprehensive lease tracking system for tenants to view lease terms, renewal dates, and history",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Important tenant feature - helps tenants stay informed about their lease status.",
        created_by: user.id
      },

      // Landlord Features
      {
        title: "Rent tracking with filters",
        description: "Enhance rent tracking dashboard with advanced filtering by property, date range, status, and tenant",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Important landlord tool - basic rent tracking exists, needs advanced filtering.",
        created_by: user.id
      },
      {
        title: "Landlord self-service property import",
        description: "Allow landlords to import their own properties via CSV or spreadsheet without admin assistance",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - useful for onboarding but can be done manually initially.",
        created_by: user.id
      },
      {
        title: "Dual account support (Landlord + Tenant)",
        description: "Enable users to have both landlord and tenant accounts simultaneously with easy switching",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - edge case that adds complexity. Not required for V1.",
        created_by: user.id
      },

      // Analytics & Dashboard
      {
        title: "Auto-assigner matchmaker queue",
        description: "Create automated matching queue system with timer-based assignment for property-tenant matching",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Complex matching algorithm - important for efficiency but can be manual in V1.",
        created_by: user.id
      },
      {
        title: "Tax management double-check",
        description: "Review and verify all tax-related features are properly implemented and wrapped for V2 as planned",
        category: "Infrastructure",
        priority: "High",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Tax features exist and are properly scoped for V2.",
        created_by: user.id
      },

      // Infrastructure
      {
        title: "Remove all mock data",
        description: "Remove all placeholder and mock data from components throughout the application for production readiness",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "CRITICAL for V1 - mock data found in multiple components. Must be removed before launch.",
        created_by: user.id
      },
      {
        title: "Email system limits upgrade",
        description: "Upgrade Resend email service limits to handle production email volume",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "1 hour",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - Resend integrated but limits need upgrade for production scale.",
        created_by: user.id
      },
      {
        title: "Terms of service update",
        description: "Update terms of service page with current, legally reviewed content for production",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "2 hours",
        source: "CSV Import",
        ai_reasoning: "Legal requirement - TOS page exists but needs final production content.",
        created_by: user.id
      },
      {
        title: "Support email configuration",
        description: "Configure and test help/support email submission and routing system",
        category: "Infrastructure",
        priority: "Critical",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Help/support submission functionality is working.",
        created_by: user.id
      },

      // Blog/Content (V2)
      {
        title: "Blog implementation",
        description: "Build complete blog system with posts, categories, SEO, and content management",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "3 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - blog tables exist in database but UI not implemented. Not critical for V1.",
        created_by: user.id
      },

      // Additional tasks from spreadsheet (rows 27-87)
      {
        title: "Maintenance request workflow completion",
        description: "Verify and complete maintenance request submission, tracking, and resolution workflow",
        category: "Feature",
        priority: "High",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Maintenance request system is functional.",
        created_by: user.id
      },
      {
        title: "Payment method management",
        description: "Enable users to add, edit, and remove payment methods for rent and other transactions",
        category: "Feature",
        priority: "High",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Payment method management exists in the system.",
        created_by: user.id
      },
      {
        title: "Points earning system",
        description: "Complete points earning system for user actions and engagement",
        category: "Feature",
        priority: "Medium",
        status: "Done",
        estimated_time: "N/A",
        source: "CSV Import",
        ai_reasoning: "ALREADY IMPLEMENTED - Points earning functionality is working.",
        created_by: user.id
      },
      {
        title: "Help center and documentation",
        description: "Create comprehensive help center with FAQs, guides, and support documentation",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for user onboarding - help submission works, needs documentation content.",
        created_by: user.id
      },
      {
        title: "User notification preferences",
        description: "Allow users to configure which email and in-app notifications they receive",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Important for user experience - prevents notification fatigue. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Property image gallery improvements",
        description: "Enhance property image gallery with better organization, zoom, and navigation features",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "UX enhancement - property images display currently but could be improved.",
        created_by: user.id
      },
      {
        title: "Advanced property search filters",
        description: "Add more property search filters including amenities, pet policy, parking, and custom criteria",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important tenant feature - basic search exists, advanced filters add value.",
        created_by: user.id
      },
      {
        title: "Mobile responsive design audit",
        description: "Complete audit and fixes for mobile responsiveness across all pages and components",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - many users will access on mobile. Requires comprehensive testing.",
        created_by: user.id
      },
      {
        title: "Performance optimization pass",
        description: "Optimize application performance including bundle size, loading times, and render performance",
        category: "Infrastructure",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for UX - can be iterative. Should do basic optimization before V1.",
        created_by: user.id
      },
      {
        title: "Accessibility compliance (WCAG)",
        description: "Ensure application meets WCAG 2.1 AA accessibility standards",
        category: "Infrastructure",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Legal and ethical requirement - should be addressed before V1 but can be iterative.",
        created_by: user.id
      },
      {
        title: "Error tracking and monitoring",
        description: "Implement error tracking service (Sentry, LogRocket, etc.) for production monitoring",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - need to know when things break. Quick integration.",
        created_by: user.id
      },
      {
        title: "Analytics and user tracking",
        description: "Implement analytics platform (Google Analytics, Mixpanel, etc.) to track user behavior and conversion",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Important for V1 - need data to make informed decisions. Standard integration.",
        created_by: user.id
      },
      {
        title: "Backup and disaster recovery plan",
        description: "Document and implement backup strategy and disaster recovery procedures for production",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - Supabase has backups but need documented recovery process.",
        created_by: user.id
      },
      {
        title: "Security audit and penetration testing",
        description: "Conduct comprehensive security audit and penetration testing before production launch",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 - must verify security before handling real user data.",
        created_by: user.id
      },
      {
        title: "RLS policy comprehensive review",
        description: "Review all Row Level Security policies to ensure data access is properly restricted",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Critical security task - RLS policies exist but need comprehensive audit.",
        created_by: user.id
      },
      {
        title: "API rate limiting implementation",
        description: "Implement rate limiting on all API endpoints to prevent abuse and ensure fair usage",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Important for V1 - prevents abuse and ensures system stability.",
        created_by: user.id
      },
      {
        title: "Email deliverability optimization",
        description: "Optimize email deliverability including SPF, DKIM, DMARC configuration",
        category: "Infrastructure",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 day",
        source: "CSV Import",
        ai_reasoning: "Important for V1 - ensures emails don't end up in spam.",
        created_by: user.id
      },
      {
        title: "Production environment setup",
        description: "Complete production environment configuration including domains, SSL, CDN, etc.",
        category: "Infrastructure",
        priority: "Critical",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Critical for V1 launch - infrastructure must be production-ready.",
        created_by: user.id
      },
      {
        title: "User onboarding flow optimization",
        description: "Optimize new user onboarding flow to improve completion rates and reduce friction",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for V1 - first impressions matter. Basic flow exists, needs optimization.",
        created_by: user.id
      },
      {
        title: "Dashboard loading states and skeletons",
        description: "Add proper loading states and skeleton screens to all dashboard components",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "UX polish - improves perceived performance. Should be done before V1.",
        created_by: user.id
      },
      {
        title: "Empty state designs for all views",
        description: "Create and implement helpful empty state designs for all data views (no properties, no tenants, etc.)",
        category: "Enhancement",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "UX polish - helps new users understand what to do. Important for V1.",
        created_by: user.id
      },
      {
        title: "Comprehensive form validation",
        description: "Review and enhance form validation across all forms with clear error messages",
        category: "Enhancement",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for V1 - prevents data issues and improves UX. Forms exist, need validation review.",
        created_by: user.id
      },
      {
        title: "Document storage and management",
        description: "Implement document upload, storage, and management system for leases, contracts, etc.",
        category: "Feature",
        priority: "High",
        status: "In Progress",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important for property management - basic storage exists, needs full management UI.",
        created_by: user.id
      },
      {
        title: "Export reports to PDF",
        description: "Add ability to export various reports and documents to PDF format",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Useful feature - users want to save and share reports. Not critical for V1.",
        created_by: user.id
      },
      {
        title: "Print-friendly views",
        description: "Create print-friendly CSS for key documents and reports",
        category: "Enhancement",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Nice to have - some users prefer printing. V2 feature.",
        created_by: user.id
      },
      {
        title: "Internationalization (i18n) support",
        description: "Add internationalization framework to support multiple languages in the future",
        category: "Infrastructure",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - not needed for initial English-only launch.",
        created_by: user.id
      },
      {
        title: "Dark mode support",
        description: "Implement dark mode theme option for better accessibility and user preference",
        category: "Enhancement",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Nice to have - popular feature but not critical for V1. V2 feature.",
        created_by: user.id
      },
      {
        title: "Keyboard shortcuts",
        description: "Add keyboard shortcuts for power users to navigate and perform actions quickly",
        category: "Enhancement",
        priority: "Low",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Power user feature - nice to have but not critical. V2 feature.",
        created_by: user.id
      },
      {
        title: "Advanced data export options",
        description: "Support exporting data in multiple formats (CSV, Excel, JSON) with customizable fields",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - useful for data portability but not critical for launch.",
        created_by: user.id
      },
      {
        title: "Scheduled reports and emails",
        description: "Allow users to schedule automatic report generation and email delivery",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - automation is valuable but not required for V1.",
        created_by: user.id
      },
      {
        title: "Webhook integration support",
        description: "Add webhook support for external integrations to receive real-time events",
        category: "Infrastructure",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - useful for integrations but not needed initially.",
        created_by: user.id
      },
      {
        title: "API documentation",
        description: "Create comprehensive API documentation for potential future integrations",
        category: "Infrastructure",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "V2 feature - useful once API is stable and public integrations are needed.",
        created_by: user.id
      },
      {
        title: "User feedback and rating system",
        description: "Implement system for users to rate and review properties, landlords, and tenants",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Important marketplace feature - builds trust. Complex but valuable for V1.",
        created_by: user.id
      },
      {
        title: "Messaging system between users",
        description: "Create in-app messaging system for communication between landlords and tenants",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Important communication feature - facilitates discussions. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Notification center",
        description: "Build centralized notification center showing all user notifications with read/unread status",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "UX feature - helps users track all activity. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Saved searches and alerts",
        description: "Allow tenants to save property searches and receive alerts when matching properties are listed",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Valuable tenant feature - improves engagement. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Property comparison tool",
        description: "Create side-by-side property comparison tool for tenants evaluating multiple properties",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Nice to have - helpful for decision making but not critical. V2 feature.",
        created_by: user.id
      },
      {
        title: "Virtual tour integration",
        description: "Integrate virtual tour capability (360° photos, video tours) for property listings",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - modern capability but requires 3rd party integration. Not critical for V1.",
        created_by: user.id
      },
      {
        title: "Lease template library",
        description: "Create library of customizable lease templates for different property types and jurisdictions",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Valuable landlord feature - requires legal review. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "E-signature integration",
        description: "Integrate e-signature service (DocuSign, HelloSign) for lease signing",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Modern convenience - reduces friction in lease signing. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Rental application fee processing",
        description: "Implement system to collect and process rental application fees from tenants",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Revenue feature - Stripe integration exists, needs application fee logic.",
        created_by: user.id
      },
      {
        title: "Background check integration",
        description: "Integrate background check service for tenant screening",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Important landlord feature - background check tables exist, needs API integration.",
        created_by: user.id
      },
      {
        title: "Credit check integration",
        description: "Integrate credit reporting service for tenant financial screening",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 weeks",
        source: "CSV Import",
        ai_reasoning: "Important landlord feature - critical for risk assessment. High priority for V1.",
        created_by: user.id
      },
      {
        title: "Income verification system",
        description: "Create system for tenants to verify income with document upload and validation",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important screening feature - reduces fraud and improves landlord confidence.",
        created_by: user.id
      },
      {
        title: "Automated late fee calculation",
        description: "Implement automatic late fee calculation and application based on lease terms",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Helpful automation - requires lease term parsing and payment tracking integration.",
        created_by: user.id
      },
      {
        title: "Rent payment reminders",
        description: "Send automated rent payment reminders to tenants before due date",
        category: "Feature",
        priority: "High",
        status: "Backlog",
        estimated_time: "2 days",
        source: "CSV Import",
        ai_reasoning: "Important feature - reduces late payments. Email system exists, needs scheduling logic.",
        created_by: user.id
      },
      {
        title: "Move-in/move-out checklists",
        description: "Create digital move-in and move-out inspection checklists with photo capability",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Useful property management tool - reduces disputes. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Security deposit tracking",
        description: "Track security deposits with automatic calculation of deductions and refunds",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Important financial feature - tracks significant amounts. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Insurance certificate tracking",
        description: "Track and manage renter's insurance certificates with expiration alerts",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "3 days",
        source: "CSV Import",
        ai_reasoning: "Nice to have - important for risk management but can be manual initially. V2 feature.",
        created_by: user.id
      },
      {
        title: "Work order scheduling calendar",
        description: "Create calendar view for scheduling and managing maintenance work orders",
        category: "Feature",
        priority: "Medium",
        status: "Backlog",
        estimated_time: "1 week",
        source: "CSV Import",
        ai_reasoning: "Useful operations tool - improves maintenance efficiency. Medium priority for V1.",
        created_by: user.id
      },
      {
        title: "Vendor marketplace",
        description: "Create marketplace for property management vendors (cleaners, contractors, etc.)",
        category: "Feature",
        priority: "Low",
        status: "Backlog",
        estimated_time: "3 weeks",
        source: "CSV Import",
        ai_reasoning: "V2 feature - complex marketplace functionality. Not needed for V1.",
        created_by: user.id
      }
    ];

    const { data, error } = await supabase
      .from('implementation_tasks')
      .insert(tasks);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${tasks.length} tasks`,
        tasksImported: tasks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing tasks:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
