
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactQueryProvider } from "@/lib/react-query";
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { AccountRolesProvider } from "@/providers/AccountRolesProvider";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { DynamicThemeProvider } from "@/components/DynamicThemeProvider";
import { ThemeGuard } from "@/components/ThemeGuard";
import SubdomainDetector from "@/components/SubdomainDetector";
import { PermissionProvider } from "@/providers/PermissionProvider";
import ScrollToTop from "./components/ScrollToTop";
import ImpersonationBanner from "./components/ImpersonationBanner";
import { MfaBanner } from "./components/security/MfaBanner";
import { GrantAlertsController } from "./components/GrantAlertsController";
import IdentityMergeBanner from "./components/identity/IdentityMergeBanner";
import RouteAccessLogger from "./components/RouteAccessLogger";
import { HelmetProvider } from 'react-helmet-async';
import { lazyRetry } from "@/lib/lazyRetry";

// ── Eager: core entry pages (must boot even if other modules fail) ──
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

// ── Lazy: everything else ──
const FindHome = lazyRetry(() => import("./pages/FindHome"));
const About = lazyRetry(() => import("./pages/About"));
const PropertySearch = lazyRetry(() => import("./pages/PropertySearch"));
const LandlordHAP = lazyRetry(() => import("./pages/LandlordHAP"));
const MaintenanceRequests = lazyRetry(() => import("./pages/MaintenanceRequests"));
const PropertyImportPage = lazyRetry(() => import("./pages/PropertyImportPage"));
const DuplicateManagerPage = lazyRetry(() => import("./pages/DuplicateManagerPage"));
const InvitationPage = lazyRetry(() => import("./pages/InvitationPage"));
const TenantInvitation = lazyRetry(() => import("./pages/TenantInvitation"));
const RbacLogsPage = lazyRetry(() => import("./pages/admin/RbacLogsPage"));
const PermissionExplorerPage = lazyRetry(() => import("./pages/admin/PermissionExplorerPage"));
const NotificationCenterPage = lazyRetry(() => import("./pages/admin/NotificationCenterPage"));
const SubscriptionManagementPage = lazyRetry(() => import("./pages/admin/SubscriptionManagementPage"));
const AccessRequestsPage = lazyRetry(() => import("./pages/admin/AccessRequestsPage"));
const AutoPusherSettings = lazyRetry(() => import("./pages/admin/AutoPusherSettings"));
const PushActivityHub = lazyRetry(() => import("./pages/admin/PushActivityHub"));
const AgencyDetailPage = lazyRetry(() => import("./pages/admin/AgencyDetailPage"));
const AdminActiveGrants = lazyRetry(() => import("./pages/AdminActiveGrants"));
const MyAccess = lazyRetry(() => import("./pages/MyAccess"));
const AcceptAdminInvitePage = lazyRetry(() => import("./pages/AcceptAdminInvitePage"));
const PublicInvoiceView = lazyRetry(() => import("./pages/agency/PublicInvoiceView"));
const SavedPropertiesList = lazyRetry(() => import("./components/SavedPropertiesList"));
const TenantPaymentsTab = lazyRetry(() => import("./components/TenantPaymentsTab"));
const Billing = lazyRetry(() => import("./pages/Billing"));
const MarketplaceInfo = lazyRetry(() => import("./pages/MarketplaceInfo"));
const MarketplaceAnalytics = lazyRetry(() => import("./pages/admin/MarketplaceAnalytics"));
const Applications = lazyRetry(() => import("./pages/Applications"));
const MarketplaceApplications = lazyRetry(() => import("./pages/MarketplaceApplications"));
const TenantMessagesPage = lazyRetry(() => import("./pages/TenantMessages"));
const SecurityDashboardPage = lazyRetry(() => import("./pages/admin/SecurityDashboardPage"));
const PiiAccessLogPage = lazyRetry(() => import("./pages/admin/PiiAccessLogPage"));
const HudComplianceHubPage = lazyRetry(() => import("./pages/admin/HudComplianceHubPage"));
const RetentionPoliciesPage = lazyRetry(() => import("./pages/admin/RetentionPoliciesPage"));
const LegalHoldsPage = lazyRetry(() => import("./pages/admin/LegalHoldsPage"));
const DsarQueuePage = lazyRetry(() => import("./pages/admin/DsarQueuePage"));
const SecurityIncidentsPage = lazyRetry(() => import("./pages/admin/SecurityIncidentsPage"));
const ConsentsAdminPage = lazyRetry(() => import("./pages/admin/ConsentsAdminPage"));
const PrivacyCenterPage = lazyRetry(() => import("./pages/PrivacyCenterPage"));
const MyDataRequestPage = lazyRetry(() => import("./pages/MyDataRequestPage"));
const VawaCertifyPage = lazyRetry(() => import("./pages/VawaCertifyPage"));
const BreachAcknowledgePage = lazyRetry(() => import("./pages/BreachAcknowledgePage"));
const PaymentSettings = lazyRetry(() => import("./pages/PaymentSettings"));
const PortfolioSettings = lazyRetry(() => import("./pages/PortfolioSettings"));
const UserRoles = lazyRetry(() => import("./pages/UserRoles"));
const LandlordNotifications = lazyRetry(() => import("./pages/LandlordNotifications"));
const LandlordInbox = lazyRetry(() => import("./pages/LandlordInbox"));
const TenantProfilePage = lazyRetry(() => import("./pages/TenantProfile"));
const PaymentRedirect = lazyRetry(() => import("./pages/PaymentRedirect"));
const PlacementFeePaymentSuccess = lazyRetry(() => import("./pages/PlacementFeePaymentSuccess"));
const ApplicationProcess = lazyRetry(() => import("./pages/ApplicationProcess"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const FAQ = lazyRetry(() => import("./pages/FAQ"));
const InvestorSignup = lazyRetry(() => import("./pages/InvestorSignup"));
const Resources = lazyRetry(() => import("./pages/Resources"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Section8Info = lazyRetry(() => import("./pages/Section8Info"));
const RentPaymentsNew = lazyRetry(() => import("./pages/RentPaymentsNew"));
const AdminMessages = lazyRetry(() => import("./pages/AdminMessages"));
const AdminDashboard = lazyRetry(() => import("./components/admin/AdminDashboard"));
const SEOLandingPage = lazyRetry(() => import("./pages/SEOLandingPage"));
const SitemapXml = lazyRetry(() => import("./pages/SitemapXml"));
const StructuredPage = lazyRetry(() => import("./pages/StructuredPage"));
const TenantsLanding = lazyRetry(() => import("./pages/tenants/Index"));
const SmallLandlordsLanding = lazyRetry(() => import("./pages/landlords/Small"));
const PortfoliosLanding = lazyRetry(() => import("./pages/landlords/Portfolios"));
const InvestorsLanding = lazyRetry(() => import("./pages/landlords/Investors"));
const RealtorsLanding = lazyRetry(() => import("./pages/landlords/Realtors"));
const PropertyRentAnalyzer = lazyRetry(() => import("./pages/tools/PropertyRentAnalyzer"));
const TenantEligibilityCalculator = lazyRetry(() => import("./pages/tools/TenantEligibilityCalculator"));
const HousingMarketDemand = lazyRetry(() => import("./pages/tools/HousingMarketDemand"));
const AgencyLogin = lazyRetry(() => import("./pages/AgencyLogin"));
const AgencyDashboard = lazyRetry(() => import("./pages/AgencyDashboard"));
const AgencyOnboarding = lazyRetry(() => import("./pages/AgencyOnboarding"));
const DisbursementsSearch = lazyRetry(() => import("./pages/agency/DisbursementsSearch"));
const AgencySignup = lazyRetry(() => import("./pages/AgencySignup"));
const AgencyApply = lazyRetry(() => import("./pages/AgencyApply"));
const PublicWaitlistApplication = lazyRetry(() => import("./pages/PublicWaitlistApplication"));
const ClaimAccount = lazyRetry(() => import("./pages/ClaimAccount"));
const PublicLandlordApplication = lazyRetry(() => import("./pages/PublicLandlordApplication"));
const ForAgencies = lazyRetry(() => import("./pages/ForAgencies"));
const FeatureDemo = lazyRetry(() => import("./pages/FeatureDemo"));
const Trust = lazyRetry(() => import("./pages/Trust"));
const InspectorToday = lazyRetry(() => import("./pages/inspector/InspectorToday"));
const InspectorInspection = lazyRetry(() => import("./pages/inspector/InspectorInspection"));
const InspectorSync = lazyRetry(() => import("./pages/inspector/InspectorSync"));
const RftaSubmission = lazyRetry(() => import("./pages/RftaSubmission"));
const Section8Portal = lazyRetry(() => import("./pages/Section8Portal"));
const Section8HousingByCity = lazyRetry(() => import("./pages/Section8HousingByCity"));
const Section8HousingIndex = lazyRetry(() => import("./pages/Section8HousingIndex"));
const GrowthTractionPage = lazyRetry(() => import("./pages/admin/GrowthTraction"));
const MultiAgencyQa = lazyRetry(() => import("./pages/admin/MultiAgencyQa"));
const LaunchQAChecklist = lazyRetry(() => import("./pages/admin/LaunchQAChecklist"));
const SecurityPage = lazyRetry(() => import("./pages/account/SecurityPage"));
const MfaChallenge = lazyRetry(() => import("./pages/auth/MfaChallenge"));
const ResetPassword = lazyRetry(() => import("./pages/auth/ResetPassword"));

// Lazy: named exports need wrapper
const InvitationAcceptance = lazyRetry(() => import("@/components/InvitationAcceptance").then(m => ({ default: m.InvitationAcceptance })));
const MarketplaceGuard = lazyRetry(() => import("./components/marketplace/MarketplaceGuard").then(m => ({ default: m.MarketplaceGuard })));
const TaxCenter = lazyRetry(() => import("./pages/TaxCenter").then(m => ({ default: m.TaxCenter })));
const TenantPayRentTab = lazyRetry(() => import("./components/TenantPayRentTab").then(m => ({ default: m.TenantPayRentTab })));
const PaymentConfirmation = lazyRetry(() => import("./pages/PaymentConfirmation").then(m => ({ default: m.PaymentConfirmation })));
const RentPaymentConfirmation = lazyRetry(() => import("./pages/RentPaymentConfirmation"));
const PaymentHistory = lazyRetry(() => import("./pages/PaymentHistory").then(m => ({ default: m.PaymentHistory })));
const AutopayManagement = lazyRetry(() => import("./pages/AutopayManagement").then(m => ({ default: m.AutopayManagement })));
const LandlordPayments = lazyRetry(() => import("./pages/LandlordPayments").then(m => ({ default: m.LandlordPayments })));
const MyInvitations = lazyRetry(() => import("./pages/MyInvitations").then(m => ({ default: m.MyInvitations })));
const AcceptAssetInvitation = lazyRetry(() => import("./pages/AcceptAssetInvitation").then(m => ({ default: m.AcceptAssetInvitation })));
const PermissionGuard = lazyRetry(() => import("./components/permissions/PermissionGuard").then(m => ({ default: m.default })));

// Only render grant alerts + route logger for authenticated users
function AuthenticatedExtras() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <RouteAccessLogger />
      <GrantAlertsController />
      <IdentityMergeBanner />
    </>
  );
}

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Send authenticated users straight to the dashboard when they hit the public
// landing page (via back button, bookmark, or typing `/` manually).
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Index />;
}

// Block authenticated users from reaching the auth/login/signup screens —
// they belong on the dashboard. Preserves query string (e.g. ?mode=login).
function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Auth />;
}

// Error fallback for the entire app — uses fixed colors so it's always visible
function AppErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <RefreshCw style={{ width: 24, height: 24, color: '#dc2626' }} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          We're having trouble loading the page. Please try again.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
          {error?.message || 'Unknown error'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button onClick={resetErrorBoundary} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
            ↻ Try Again
          </button>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
            ⟳ Reload Page
          </button>
          <button onClick={() => { window.location.href = '/'; }} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Global async error safety net
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[App] Unhandled promise rejection:', e.reason);
  });
  window.addEventListener('error', (e) => {
    console.error('[App] Global error:', e.error || e.message);
  });
}

function App() {
  return (
    <HelmetProvider>
    <ErrorBoundary FallbackComponent={AppErrorFallback} onReset={() => window.location.reload()}>
    <ReactQueryProvider>
      <AuthProvider>
        <AccountRolesProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          storageKey="ok-theme-v2"
        >
          <DynamicThemeProvider>
            <ThemeGuard>
              <TooltipProvider>
                <PreferencesProvider>
                  <CurrencyProvider>
                    <LanguageProvider>
                  <SubdomainDetector>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <ScrollToTop />
                      <PermissionProvider>
                        <ImpersonationBanner />
                        <MfaBanner />
                        <AuthenticatedExtras />
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                           <Route path="/agency/invoice/:token" element={<PublicInvoiceView />} />
                           <Route path="/" element={<HomeRoute />} />
                            <Route path="/find-home" element={<FindHome />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/browse-properties" element={<Navigate to="/find-home" replace />} />
                            <Route path="/section8-info" element={<Section8Info />} />
                            <Route path="/application-process" element={<ApplicationProcess />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPost />} />
                            <Route path="/sitemap.xml" element={<SitemapXml />} />
                            <Route path="/faq" element={<FAQ />} />
                            <Route path="/investor-signup" element={<InvestorSignup />} />
                            <Route path="/resources" element={<Resources />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/login" element={<AuthRoute />} />
                            <Route path="/signup" element={<AuthRoute />} />
                            <Route path="/auth" element={<AuthRoute />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/portfolio-select" element={<Navigate to="/dashboard" replace />} />
                             <Route path="/search" element={<PropertySearch />} />
                             <Route path="/messages" element={<TenantMessagesPage />} />
                             <Route path="/admin-messages" element={<AdminMessages />} />
                             <Route path="/marketplace" element={<MarketplaceGuard />} />
          <Route path="/marketplace-info" element={<MarketplaceInfo />} />
          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
                             <Route path="/saved" element={<SavedPropertiesList />} />
                             <Route path="/payments" element={<TenantPaymentsTab />} />
                             <Route path="/rent-payments-new" element={<RentPaymentsNew />} />
                              <Route path="/pay-rent" element={<TenantPayRentTab />} />
                              <Route path="/payments/history" element={<PaymentHistory />} />
                              <Route path="/landlord/autopay" element={<AutopayManagement />} />
                              <Route path="/landlord/payments" element={<LandlordPayments />} />
                              <Route path="/my-invitations" element={<MyInvitations />} />
                              <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
                              <Route path="/rent-payment-confirmation" element={<RentPaymentConfirmation />} />
                              <Route path="/billing" element={<Billing />} />
                              <Route path="/payment-settings" element={<PaymentSettings />} />
                             <Route path="/tax/:portfolioId" element={<TaxCenter />} />
                            <Route path="/landlord-hap" element={<LandlordHAP />} />
                            <Route path="/maintenance" element={<MaintenanceRequests />} />
                            <Route path="/property-import" element={<PropertyImportPage />} />
                            <Route path="/duplicates" element={<DuplicateManagerPage />} />
                             <Route path="/accept-invitation" element={<InvitationAcceptance />} />
                             <Route path="/accept-asset-invitation" element={<AcceptAssetInvitation />} />
                             <Route path="/accept-admin-invite" element={<AcceptAdminInvitePage />} />
                             <Route path="/tenant-invitation" element={<TenantInvitation />} />
                             <Route path="/admin" element={<AdminDashboard />} />
                             <Route path="/for-agencies" element={<ForAgencies />} />
                             <Route path="/pricing/agencies" element={<ForAgencies />} />
                             <Route path="/demos/:featureKey" element={<FeatureDemo />} />
                             <Route path="/trust" element={<Trust />} />
                             <Route path="/inspector/today" element={<InspectorToday />} />
                             <Route path="/inspector/inspection/:id" element={<InspectorInspection />} />
                             <Route path="/inspector/sync" element={<InspectorSync />} />
                             <Route path="/agency/login" element={<AgencyLogin />} />
                             <Route path="/agency-login" element={<AgencyLogin />} />
                             <Route path="/login" element={<AgencyLogin />} />
                             <Route path="/agency/signup" element={<AgencySignup />} />
                             <Route path="/agency/:slug/apply" element={<AgencyApply />} />
                             <Route path="/apply/:agencySlug" element={<PublicWaitlistApplication />} />
                            <Route path="/claim/:token" element={<ClaimAccount />} />
                            <Route path="/landlord-apply/:agencySlug" element={<PublicLandlordApplication />} />
                             <Route path="/agency" element={<AgencyDashboard />} />
                             <Route path="/agency/onboarding" element={<AgencyOnboarding />} />
                             <Route path="/agency/finance/disbursements" element={<Suspense fallback={<PageLoader />}><DisbursementsSearch /></Suspense>} />
                             <Route path="/rfta/submit/:token" element={<RftaSubmission />} />
                             <Route path="/admin/rbac-logs" element={<RbacLogsPage />} />
                             <Route path="/admin/agency/:agencyId" element={
                               <Suspense fallback={<PageLoader />}>
                                 <AgencyDetailPage />
                               </Suspense>
                             } />
                             <Route path="/admin/permission-explorer" element={<PermissionExplorerPage />} />
                             <Route path="/admin/access-requests" element={<AccessRequestsPage />} />
                              <Route path="/admin/access-grants" element={<AdminActiveGrants />} />
                              <Route path="/admin/matchmaker/auto-pusher" element={<Suspense fallback={<PageLoader />}><AutoPusherSettings /></Suspense>} />
                              <Route path="/admin/matchmaker/push-activity" element={<Suspense fallback={<PageLoader />}><PushActivityHub /></Suspense>} />
                             <Route path="/admin/growth-traction" element={<GrowthTractionPage />} />
                             <Route path="/admin/qa/multi-agency" element={<Suspense fallback={<PageLoader />}><MultiAgencyQa /></Suspense>} />
                             <Route path="/admin/qa/launch-checklist" element={<Suspense fallback={<PageLoader />}><LaunchQAChecklist /></Suspense>} />
                            <Route path="/settings/my-access" element={<MyAccess />} />
          <Route path="/admin/marketplace-analytics" element={
            <Suspense fallback={<PageLoader />}>
              <MarketplaceAnalytics />
            </Suspense>
          } />
          <Route path="/admin/marketplace-applications" element={<MarketplaceApplications />} />
          <Route path="/admin/security" element={
            <Suspense fallback={<PageLoader />}>
              <SecurityDashboardPage />
            </Suspense>
          } />
          <Route path="/admin/security/pii-access-log" element={
            <Suspense fallback={<PageLoader />}>
              <PiiAccessLogPage />
            </Suspense>
          } />
          <Route path="/admin/compliance" element={<Suspense fallback={<PageLoader />}><HudComplianceHubPage /></Suspense>} />
          <Route path="/admin/compliance/retention" element={<Suspense fallback={<PageLoader />}><RetentionPoliciesPage /></Suspense>} />
          <Route path="/admin/compliance/legal-holds" element={<Suspense fallback={<PageLoader />}><LegalHoldsPage /></Suspense>} />
          <Route path="/admin/compliance/dsar" element={<Suspense fallback={<PageLoader />}><DsarQueuePage /></Suspense>} />
          <Route path="/admin/compliance/incidents" element={<Suspense fallback={<PageLoader />}><SecurityIncidentsPage /></Suspense>} />
          <Route path="/admin/compliance/consents" element={<Suspense fallback={<PageLoader />}><ConsentsAdminPage /></Suspense>} />
          <Route path="/privacy-center" element={<Suspense fallback={<PageLoader />}><PrivacyCenterPage /></Suspense>} />
          <Route path="/my-data-request" element={<Suspense fallback={<PageLoader />}><MyDataRequestPage /></Suspense>} />
          <Route path="/vawa-certify" element={<Suspense fallback={<PageLoader />}><VawaCertifyPage /></Suspense>} />
          <Route path="/security/breach-acknowledge" element={<Suspense fallback={<PageLoader />}><BreachAcknowledgePage /></Suspense>} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/portfolio/:portfolioId/settings" element={<PortfolioSettings />} />
          <Route path="/user-roles" element={<UserRoles />} />
          <Route path="/section-8" element={<Section8Portal />} />
                            <Route path="/landlord-notifications" element={<LandlordNotifications />} />
                            <Route path="/landlord-inbox" element={<LandlordInbox />} />
                            <Route path="/tenant-profile" element={<TenantProfilePage />} />
                            <Route path="/tenant-profile/:tenantId" element={<TenantProfilePage />} />
                            <Route path="/pay/success" element={<PlacementFeePaymentSuccess />} />
                            <Route path="/pay/:slug" element={<PaymentRedirect />} />
                            {/* SEO Landing Pages */}
                            <Route path="/housing/:state" element={<SEOLandingPage />} />
                            <Route path="/housing/:state/:city" element={<SEOLandingPage />} />
                            
                            {/* Structured SEO Pages */}
                            <Route path="/section-8/:state" element={<StructuredPage />} />
                            <Route path="/section-8/:state/:city" element={<StructuredPage />} />
                            <Route path="/landlords/:state/:city" element={<StructuredPage />} />
                            <Route path="/property-management/:state/:city" element={<StructuredPage />} />
                            <Route path="/compare/:slug" element={<StructuredPage />} />
                            <Route path="/rent-data/:state/:city" element={<StructuredPage />} />

                            {/* Programmatic Section 8 City Pages */}
                            <Route path="/section-8-housing" element={<Section8HousingIndex />} />
                            <Route path="/section-8-housing/:citySlug" element={<Section8HousingByCity />} />
                            
                            {/* Ad Landing Pages */}
                            <Route path="/tenants" element={<TenantsLanding />} />
                            <Route path="/landlords/small" element={<SmallLandlordsLanding />} />
                            <Route path="/landlords/portfolios" element={<PortfoliosLanding />} />
                            <Route path="/landlords/investors" element={<InvestorsLanding />} />
                            <Route path="/landlords/realtors" element={<RealtorsLanding />} />
                            
                            {/* Housing Intelligence Tools */}
                            <Route path="/tools/property-rent-analyzer" element={<PropertyRentAnalyzer />} />
                            <Route path="/tools/tenant-eligibility" element={<TenantEligibilityCalculator />} />
                            <Route path="/tools/housing-market-demand" element={<HousingMarketDemand />} />
                            
                            {/* MFA / Account security */}
                            <Route path="/account/security" element={<SecurityPage />} />
                            <Route path="/auth/mfa-challenge" element={<MfaChallenge />} />
                            <Route path="/auth/reset-password" element={<ResetPassword />} />

                            {/* Catch-all content route */}
                            <Route path="/:slug" element={<StructuredPage />} />
                            
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                        </PermissionProvider>
                      </BrowserRouter>
                  </SubdomainDetector>
                    </LanguageProvider>
                  </CurrencyProvider>
                </PreferencesProvider>
              </TooltipProvider>
            </ThemeGuard>
          </DynamicThemeProvider>
        </ThemeProvider>
      </AccountRolesProvider>
      </AuthProvider>
    </ReactQueryProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
