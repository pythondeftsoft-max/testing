import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBackground } from '@/components/dashboard/AnimatedBackground';
import { AnimatedCard } from '@/components/dashboard/AnimatedCard';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { TheEverythingCard } from '@/components/dashboard/TheEverythingCard';
import { QuickActionsBento } from '@/components/dashboard/QuickActionsBento';
import { ListingOverviewCards } from '@/components/dashboard/ListingOverviewCards';
import { CurrencyToggle } from '@/components/dashboard/CurrencyToggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { useLandlordUnreadMessageCount } from '@/hooks/useLandlordUnreadMessageCount';
import { useRealtimeAssets } from '@/hooks/useRealtimeAssets';
import { useCurrency } from '@/contexts/CurrencyContext';
import { User } from '@supabase/supabase-js';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building, Building2, DollarSign, Users, TrendingUp, Plus, Home, FileText, Settings, User as UserIcon, LogOut, CheckCircle, Eye, Clock, ChevronDown, ChevronUp, Crown, ArrowLeft, Calendar, CreditCard, Key, BarChart3, Wrench, RefreshCw, MapPin, Upload, Shield, RotateCcw, CalendarDays } from 'lucide-react';

import { CombinedInboxButton } from '@/components/CombinedInboxButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddPropertyModal } from './AddPropertyModal';
import EditablePropertyCard from './EditablePropertyCard';
import LandlordApplications from './LandlordApplications';
import LandlordMessages from './LandlordMessages';
import LandlordNotifications from './LandlordNotifications';
import PortfolioExport from './PortfolioExport';
import PortfolioManager from './PortfolioManager';
import { ActiveGrantIndicator } from '@/components/ActiveGrantIndicator';
import { featureFlags } from '@/config/featureFlags';

import LandlordPropertyDetailsModal from './LandlordPropertyDetailsModal';
import LeaseExpirations from './LeaseExpirations';
import MaintenanceRequests from './MaintenanceRequests';
import TenantRequestModal from './TenantRequestModal';
import TenantDetailsModal from './TenantDetailsModal';
import RentSplitForm from './RentSplitForm';
import LandlordProfile from './LandlordProfile';

import GoogleMapsEmbed from './GoogleMapsEmbed';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeProperties } from '@/hooks/useProperties';
import LandlordAnalyticsDashboard from './analytics/LandlordAnalyticsDashboard';
import TenantLeaseAnalyticsHub from './analytics/TenantLeaseAnalyticsHub';
import { OperationalPerformanceDashboard } from './analytics/OperationalPerformanceDashboard';
import { FinancialPerformanceHub } from './analytics/FinancialPerformanceHub';
import { PredictiveAnalyticsHub } from './analytics/PredictiveAnalyticsHub';
import LandlordDocuments from './LandlordDocuments';
import { StripeConnectOnboarding } from './StripeConnectOnboarding';
import ReportingDashboard from './reporting/ReportingDashboard';

import SubscriptionManager from './SubscriptionManager';
import PropertyLimitWarning from './PropertyLimitWarning';
import PortfolioSelectorDropdown from './PortfolioSelectorDropdown';
import { useSubscription } from '@/hooks/useSubscription';
import { usePortfolioRoles } from '@/hooks/usePortfolioRoles';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useLeaseRenewalContractNotifications } from '@/hooks/useLeaseRenewalContractNotifications';
import { useAssetNavigation } from '@/hooks/useAssetNavigation';
import { usePortfolioExport } from '@/hooks/usePortfolioExport';



import EnhancedMetricCard from './EnhancedMetricCard';
import { useLandlordAnalytics } from '@/hooks/useLandlordAnalytics';
import PropertyBreakdownModal from './analytics/PropertyBreakdownModal';
import LandlordPointsSection from './LandlordPointsSection';
import PropertyGeocoder from './PropertyGeocoder';
import PointsActivityFeed from '@/components/points/PointsActivityFeed';
import { useUserPoints } from '@/hooks/useUserPoints';
import { ProductTour, useTourState } from '@/components/tour';

import AlertsNotificationsCard from './dashboard/AlertsNotificationsCard';
import EnrollmentTimelineConnected from './landlord/EnrollmentTimelineConnected';
import NotificationPreferencesPanel from './notifications/NotificationPreferencesPanel';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import LandlordPaymentsPanel from '@/components/LandlordPaymentsPanel';
import { PortfolioInviteDialog } from '@/components/portfolio/PortfolioInviteDialog';
import { PaymentsTabContainer } from '@/components/payments/PaymentsTabContainer';
import { usePmMode } from '@/hooks/usePmMode';

interface LandlordDashboardProps {
  user: User;
  profile: any;
  portfolioId?: string;
  portfolioName?: string;
}

const LandlordDashboard = ({ user, profile, portfolioId, portfolioName }: LandlordDashboardProps) => {
  console.log('DEBUG: LandlordDashboard fresh render at', new Date().toISOString(), 'with portfolioId:', portfolioId);
  
  const { t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [previousTab, setPreviousTab] = useState<string>('Dashboard');
  const { pmEnabled } = usePmMode();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAssetWizard, setShowAssetWizard] = useState(false);
  const [showPortfolioInvite, setShowPortfolioInvite] = useState(false);
  const [entrySource, setEntrySource] = useState<string | null>(null);
  const [showTenantAnalytics, setShowTenantAnalytics] = useState(false);
  const [showOperationalPerformance, setShowOperationalPerformance] = useState(false);
  const [showFinancialPerformance, setShowFinancialPerformance] = useState(false);
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false);

  // Debug asset wizard state changes
  useEffect(() => {
    console.log('🎪 [LandlordDashboard] showAssetWizard state changed:', showAssetWizard);
  }, [showAssetWizard]);

  // Safety-net event listener for missing onOpenAssetWizard callbacks
  useEffect(() => {
    const handleOpenAssetWizard = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-asset-wizard', event.detail);
      setShowAssetWizard(true);
    };

    const handleOpenPortfolioInvite = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-portfolio-invite', event.detail);
      setShowPortfolioInvite(true);
    };

    const handleOpenTenantAnalytics = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-tenant-analytics');
      setShowTenantAnalytics(true);
    };

    const handleOpenOperationalPerformance = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-operational-performance');
      setShowOperationalPerformance(true);
    };

    const handleOpenFinancialPerformance = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-financial-performance');
      setShowFinancialPerformance(true);
    };

    const handleOpenPredictiveAnalytics = (event: CustomEvent) => {
      console.log('📡 [LandlordDashboard] Received window event: open-predictive-analytics');
      setShowPredictiveAnalytics(true);
    };

    window.addEventListener('open-asset-wizard', handleOpenAssetWizard as EventListener);
    window.addEventListener('open-portfolio-invite', handleOpenPortfolioInvite as EventListener);
    window.addEventListener('open-tenant-analytics', handleOpenTenantAnalytics as EventListener);
    window.addEventListener('open-operational-performance', handleOpenOperationalPerformance as EventListener);
    window.addEventListener('open-financial-performance', handleOpenFinancialPerformance as EventListener);
    window.addEventListener('open-predictive-analytics', handleOpenPredictiveAnalytics as EventListener);
    
    return () => {
      window.removeEventListener('open-asset-wizard', handleOpenAssetWizard as EventListener);
      window.removeEventListener('open-portfolio-invite', handleOpenPortfolioInvite as EventListener);
      window.removeEventListener('open-tenant-analytics', handleOpenTenantAnalytics as EventListener);
      window.removeEventListener('open-operational-performance', handleOpenOperationalPerformance as EventListener);
      window.removeEventListener('open-financial-performance', handleOpenFinancialPerformance as EventListener);
      window.removeEventListener('open-predictive-analytics', handleOpenPredictiveAnalytics as EventListener);
    };
  }, []);
  const [selectedTenantProperty, setSelectedTenantProperty] = useState<any>(null);
  const [selectedRentSetupProperty, setSelectedRentSetupProperty] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedMapProperty, setSelectedMapProperty] = useState<any>(null);
  const [leaseRefreshKey, setLeaseRefreshKey] = useState(0);
  const [maintenanceRefreshKey, setMaintenanceRefreshKey] = useState(0);
  const [applicationsRefreshKey, setApplicationsRefreshKey] = useState(0);
  const [showPropertyCards, setShowPropertyCards] = useState(true); // Control property cards visibility
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [properties, setProperties] = useState([]);
  const [applicationCounts, setApplicationCounts] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  
  // Add refs to prevent multiple simultaneous operations
  const fetchingPropertiesRef = useRef(false);
  const initializingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [messageInit, setMessageInit] = useState<{ applicationId?: string; tenantId?: string; action?: string } | null>(null);
  const [profileInitTab, setProfileInitTab] = useState<'profile' | 'documents' | 'subscriptions' | 'white-label' | undefined>(undefined);
  
  // Deduplicated properties using useMemo to prevent duplicates in render
  const deduplicatedProperties = useMemo(() => {
    const uniqueMap = new Map();
    properties.forEach(property => {
      if (!uniqueMap.has(property.id)) {
        uniqueMap.set(property.id, property);
      }
    });
    return Array.from(uniqueMap.values());
  }, [properties]);
  
  // Use portfolioId prop directly - component remounts on portfolio change
  const currentPortfolio = portfolioId || 'everything';
  console.log('DEBUG: Current portfolio from prop:', portfolioId, '-> normalized:', currentPortfolio);
  
  const handleTabChange = (tabValue: string) => {
    // Fallback to Dashboard for any unrecognized tabs
    const validTabs = ['Dashboard', 'Analytics', 'Lease Expirations', 'Properties', 'Maintenance', 'Payments', 'Tenants/Applications', 'My Rewards', 'Profile', 'Messages', 'Subscriptions'];
    const tab = validTabs.includes(tabValue) ? tabValue : 'Dashboard';
    
    // Track previous tab before switching (but not for Profile/Subscriptions modals)
    if (tab !== activeTab && activeTab !== 'Profile' && activeTab !== 'Subscriptions') {
      setPreviousTab(activeTab);
    }
    
    setActiveTab(tab);
    
    // Scroll to top whenever tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Clear property filter when leaving Applications tab
    if (tab !== 'Tenants/Applications') {
      setSelectedProperty(null);
    }
  };
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToAssets } = useAssetNavigation();
  
  // Watch URL parameters and switch to Analytics tab for asset-related navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    const subTab = searchParams.get('subTab');
    const maintenanceTab = searchParams.get('maintenanceTab');
    const openAssetWizard = searchParams.get('openAssetWizard');
    const assetSymbol = searchParams.get('assetSymbol');
    const assetCategory = searchParams.get('assetCategory');
    
    // GUARD: Don't auto-switch tabs if we're on Properties tab
    // This prevents interference with property deletion operations
    if (activeTab === 'Properties' && tab === 'properties') {
      console.log('🛡️ Tab switch guard: Staying on Properties tab, ignoring URL changes');
      return;
    }
    
    // GUARD: Don't switch tabs for analytics sub-tab values
    // These are internal to the Analytics tab and shouldn't affect main navigation
    const analyticsSubTabs = ['custom-overview', 'analytics', 'properties', 'assets', 'tenant-analytics', 'operational', 'financial', 'predictive'];
    if (tab && analyticsSubTabs.includes(tab)) {
      console.log('🛡️ Tab switch guard: Ignoring analytics sub-tab value:', tab);
      return;
    }
    
    // Handle tab parameter for lease-related navigation
    if (tab && tab !== activeTab && tab !== 'properties' && tab !== 'assets') {
      console.log('📍 URL tab parameter detected:', tab, '-> switching from', activeTab);
      handleTabChange(tab);
    }
    
    // Switch to Analytics tab if any asset-related parameters are present
    if (tab === 'assets' || openAssetWizard === '1' || assetSymbol || assetCategory) {
      handleTabChange('Analytics');
    }
    
    // Switch to Maintenance tab if maintenanceTab parameter is present
    if (maintenanceTab) {
      handleTabChange('Maintenance');
    }
  }, [location.search, activeTab]);

  // Handle hash-based navigation to activate specific tabs
  useEffect(() => {
    const hashToTabMap: { [key: string]: string } = {
      '#dashboard': 'Dashboard',
      '#analytics': 'Analytics',
      '#lease-expirations': 'Lease Expirations',
      '#properties': 'Properties',
      '#maintenance': 'Maintenance',
      '#payment-reminders': 'Payments',
      '#payments': 'Payments',
      '#tenants-applications': 'Tenants/Applications',
      '#my-rewards': 'My Rewards',
      '#profile': 'Profile',
      '#messages': 'Messages',
      '#settings': 'Settings',
      '#subscriptions': 'Subscriptions'
    };

    const currentHash = location.hash;
    if (currentHash && hashToTabMap[currentHash]) {
      console.log('Hash navigation detected:', currentHash, '-> switching to tab:', hashToTabMap[currentHash]);
      handleTabChange(hashToTabMap[currentHash]);
    }
  }, [location.hash]);
  
  // Listen for maintenance tab switch events
  useEffect(() => {
    const handleMaintenanceTabSwitch = (event: CustomEvent) => {
      console.log('Received maintenance tab switch event:', event.detail);
      handleTabChange('Maintenance');
    };

    window.addEventListener('maintenance-tab-switch', handleMaintenanceTabSwitch as EventListener);
    
    return () => {
      window.removeEventListener('maintenance-tab-switch', handleMaintenanceTabSwitch as EventListener);
    };
  }, []);
  
  // Get subscription status
  const { hasActiveSubscription } = useSubscription(user.id, 'landlord');

  // CRITICAL FIX: Never pass "everything" to usePortfolioRoles hook
  const { hasRole } = usePortfolioRoles(
    currentPortfolio !== 'everything' ? currentPortfolio : '', 
    user.id
  );

  // Direct use - no additional memoization needed since hasRole is already memoized
  const hasPortfolioRole = currentPortfolio !== 'everything' && hasRole(['admin_partner', 'editor', 'viewer', 'maintenance']);


  
  // Get notification and message counts
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useLandlordUnreadMessageCount();
  
  // Set up lease renewal contract notifications
  useLeaseRenewalContractNotifications({
    userId: user.id,
    userType: 'landlord'
  });
  
  // Export portfolio hook for direct CSV/PDF export
  const { exportCSV, loading: exportLoading } = usePortfolioExport(user.id, currentPortfolio);
  
  
  // Handle portfolio change by updating URL
  const handlePortfolioChange = useCallback((portfolioId: string) => {
    navigate(`/dashboard?portfolioId=${portfolioId}`);
  }, [navigate]);
  
  // Enable real-time updates for properties
  useRealtimeProperties(user.id);
  
  // Enable real-time updates for assets
  useRealtimeAssets(currentPortfolio !== 'everything' ? currentPortfolio : undefined);

  // Get analytics data for enhanced cards
  const {
    portfolioOverview,
    loading: analyticsLoading
  } = useLandlordAnalytics(user.id, currentPortfolio !== 'everything' ? currentPortfolio : undefined);

  // Fetch user points data for activity feed
  const { userPoints, loading: pointsLoading } = useUserPoints(
    user.id || '', 
    currentPortfolio === 'everything' ? undefined : currentPortfolio
  );

  // Transform UserPoint[] to ActivityItem[] for PointsActivityFeed
  // Only show real data — never fake activity for new accounts.
  const pointsActivities = useMemo(() => {
    if (!userPoints || userPoints.length === 0) return [];
    return userPoints.map(point => ({
      pointsChange: point.points_awarded,
      balanceAfter: undefined,
      timestamp: point.processed_at || point.created_at,
      eventType: point.source_event_type,
      notes: point.notes
    }));
  }, [userPoints]);

  const fetchProperties = useCallback(async (portfolioFilter: string, userHasPortfolioRole: boolean) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Debounce rapid successive calls
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    return new Promise<void>((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        // Prevent multiple simultaneous fetches
        if (fetchingPropertiesRef.current) {
          console.log('LandlordDashboard: fetchProperties already in progress, skipping');
          resolve();
          return;
        }
        
        // Generate unique request ID
        const currentRequestId = ++requestIdRef.current;
        console.log('LandlordDashboard: Starting fetchProperties request ID:', currentRequestId);
        
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();
        
        // Ensure user is authenticated and has a valid ID
        if (!user?.id) {
          console.log('LandlordDashboard: Cannot fetch properties - user ID not available');
          resolve();
          return;
        }
        
        // Verify we have a valid session before making database calls
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log('LandlordDashboard: Cannot fetch properties - no valid session');
          resolve();
          return;
        }
        
        fetchingPropertiesRef.current = true;
        console.log('LandlordDashboard: Starting fetchProperties for authenticated user:', user.id, 'portfolioFilter:', portfolioFilter, 'sessionUserId:', session.user.id, 'requestId:', currentRequestId);
        
        try {
          // Don't clear properties - let new data replace old data smoothly to prevent UI flicker
          console.log('DEBUG: Fetching properties for portfolio:', portfolioFilter, 'requestId:', currentRequestId);
      
      let query = supabase
        .from('properties')
        .select('*, property_units(*)')
        .is('deleted_at', null); // Only fetch non-deleted properties

      // CRITICAL FIX: Handle "everything" as UI filter only, never send to database
      if (portfolioFilter === 'everything') {
        // Show all user's own properties across all portfolios
        console.log('DEBUG: Everything view - showing all owned properties');
        query = query.eq('owner_id', user.id);
      } else {
        // Specific portfolio - validate UUID format first
        if (!portfolioFilter.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
          console.error('DEBUG: Invalid portfolio UUID format:', portfolioFilter);
          throw new Error(`Invalid portfolio ID format: ${portfolioFilter}`);
        }
        
        if (userHasPortfolioRole) {
          // User has role in this specific portfolio - show portfolio properties
          console.log('DEBUG: User has portfolio role, showing portfolio properties:', portfolioFilter);
          query = query.eq('portfolio_id', portfolioFilter);
        } else {
          // No portfolio role - show only owned properties in this portfolio
          console.log('DEBUG: No portfolio role, showing owned properties in portfolio:', portfolioFilter);
          query = query.eq('owner_id', user.id).eq('portfolio_id', portfolioFilter);
        }
      }

      console.log('DEBUG: About to execute query with filters:', {
        owner_id: user.id,
        portfolio_id: portfolioFilter !== 'everything' ? portfolioFilter : 'no filter',
        deleted_at: 'IS NULL'
      });

          const { data, error } = await query
            .order('created_at', { ascending: false })
            .abortSignal(abortControllerRef.current.signal);

      console.log('LandlordDashboard: Properties fetch result:', {
        rawDataCount: data?.length || 0,
        rawDataSample: data?.slice(0, 3).map(p => ({ 
          id: p.id, 
          address: p.address, 
          portfolio_id: p.portfolio_id, 
          owner_id: p.owner_id 
        })),
        error: error,
        userId: user.id,
        portfolioFilter: portfolioFilter,
        sessionUserId: session.user.id
      });

      if (error) {
        console.error('LandlordDashboard: Error fetching properties:', error);
        throw error;
      }

      // DEFENSIVE CHECK: Filter again at application level to ensure portfolio isolation
      const filteredData = data?.filter(property => {
        if (portfolioFilter === 'everything') return true;
        const matches = property.portfolio_id === portfolioFilter;
        if (!matches) {
          console.warn('DEBUG: Filtering out property that should not be shown:', {
            propertyId: property.id,
            propertyPortfolioId: property.portfolio_id,
            expectedPortfolio: portfolioFilter,
            propertyAddress: property.address
          });
        }
        return matches;
      }) || [];

      console.log('LandlordDashboard: After defensive filtering:', {
        originalCount: data?.length || 0,
        filteredCount: filteredData.length,
        portfolioFilter,
        removedItems: (data?.length || 0) - filteredData.length
      });

      // Add robust deduplication using Map to track unique properties by ID
      const uniquePropertiesMap = new Map();
      filteredData.forEach(property => {
        const key = property.id;
        if (!uniquePropertiesMap.has(key)) {
          uniquePropertiesMap.set(key, property);
        } else {
          console.warn('LandlordDashboard: Duplicate property detected and removed:', property.id, property.address);
        }
      });
      
      const deduplicatedProperties = Array.from(uniquePropertiesMap.values());
      
      // Log deduplication results
      if (filteredData.length !== deduplicatedProperties.length) {
        console.log('LandlordDashboard: Deduplication removed', filteredData.length - deduplicatedProperties.length, 'duplicate properties');
      }

          // Check if this request is still the latest one
          if (currentRequestId === requestIdRef.current) {
            // Use functional update to ensure deterministic state replacement
            setProperties(() => {
              console.log('LandlordDashboard: Setting properties state with', deduplicatedProperties.length, 'unique properties for portfolio:', portfolioFilter, 'requestId:', currentRequestId);
              return deduplicatedProperties;
            });
          } else {
            console.log('LandlordDashboard: Discarding stale response for requestId:', currentRequestId, 'latest is:', requestIdRef.current);
          }
          
          resolve();
        } catch (error) {
          // Don't show error for aborted requests
          if (error.name !== 'AbortError') {
            console.error('LandlordDashboard: Exception in fetchProperties:', error);
            toast({
              title: "Error fetching properties",
              description: "Please try refreshing the page",
              variant: "destructive"
            });
          } else {
            console.log('LandlordDashboard: Request aborted for requestId:', currentRequestId);
          }
          resolve();
        } finally {
          fetchingPropertiesRef.current = false;
        }
    }, 100); // 100ms debounce - faster response for property creation
    });
  }, [user?.id, toast]);

  const fetchApplicationCounts = useCallback(async (portfolioFilter: string, userHasPortfolioRole: boolean) => {
    // Ensure user is authenticated and has a valid ID
    if (!user?.id) {
      console.log('LandlordDashboard: Cannot fetch application counts - user ID not available');
      return;
    }
    
    // Verify we have a valid session before making database calls
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('LandlordDashboard: Cannot fetch application counts - no valid session');
      return;
    }
    
    try {
      console.log('LandlordDashboard: Fetching application counts for authenticated user:', user.id, 'portfolioFilter:', portfolioFilter);
      
    // Build query with proper portfolio access logic
      let query = supabase
        .from('property_applications')
        .select('status, properties!fk_property_applications_property_id(owner_id, portfolio_id)');

      // CRITICAL FIX: Handle "everything" as UI filter only for applications
      if (portfolioFilter === 'everything') {
        // Show applications for all user's own properties
        console.log('DEBUG: Everything view - showing applications for all owned properties');
        query = query.eq('properties.owner_id', user.id);
      } else {
        // Specific portfolio - validate UUID format first
        if (!portfolioFilter.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
          console.error('DEBUG: Invalid portfolio UUID format for applications:', portfolioFilter);
          return; // Exit early for invalid UUIDs
        }
        
        if (userHasPortfolioRole) {
          // User has role in this portfolio - show applications for portfolio properties
          console.log('DEBUG: User has portfolio role, showing applications for portfolio:', portfolioFilter);
          query = query.eq('properties.portfolio_id', portfolioFilter);
        } else {
          // No portfolio role - show applications for owned properties in this portfolio
          console.log('DEBUG: No portfolio role, showing applications for owned properties in portfolio:', portfolioFilter);
          query = query.eq('properties.owner_id', user.id).eq('properties.portfolio_id', portfolioFilter);
        }
      }


      const { data, error } = await query;

      console.log('LandlordDashboard: Application counts query result:', {
        data: data,
        error: error,
        count: data?.length || 0,
        sessionUserId: session.user.id
      });

      if (error) {
        console.error('LandlordDashboard: Error fetching application counts:', error);
        return;
      }

      const total = data?.length || 0;
      const pending = data?.filter(app => app.status === 'pending').length || 0;
      
      console.log('LandlordDashboard: Calculated counts:', { total, pending });
      setApplicationCounts({ total, pending });
    } catch (error) {
      console.error('LandlordDashboard: Exception in fetchApplicationCounts:', error);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Portfolio ownership validation - FIXED: Replaced malformed SQL query with two-step approach
  const validatePortfolioOwnership = useCallback(async (portfolioId: string) => {
    if (!user?.id || portfolioId === 'everything') return true;
    
    try {
      // Step 1: Fetch portfolio IDs where the user has active roles
      const { data: roleRows, error: roleErr } = await supabase
        .from('portfolio_roles')
        .select('portfolio_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (roleErr) {
        console.error('LandlordDashboard: Error fetching portfolio roles:', roleErr);
        return false;
      }

      // Step 2: Build the proper OR condition and execute the main query
      const roleIds = roleRows?.map(r => r.portfolio_id) || [];
      const orCondition = roleIds.length > 0 
        ? `manager_id.eq.${user.id},id.in.(${roleIds.join(',')})`
        : `manager_id.eq.${user.id}`;

      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .select('id, manager_id')
        .eq('id', portfolioId)
        .or(orCondition)
        .single();

      if (error || !portfolio) {
        console.error('LandlordDashboard: Portfolio ownership validation failed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('LandlordDashboard: Error validating portfolio ownership:', error);
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    const initializeDashboard = async () => {
      // Prevent multiple simultaneous initializations
      if (initializingRef.current) {
        console.log('LandlordDashboard: Dashboard initialization already in progress, skipping');
        return;
      }
      
      // Wait for user to be available
      if (!user?.id) {
        console.log('LandlordDashboard: Waiting for user ID...', { 
          userId: user?.id, 
          currentPortfolio 
        });
        return;
      }
      
      initializingRef.current = true;
      console.log('LandlordDashboard: Starting dashboard initialization for user:', user.id, 'portfolio:', currentPortfolio);
      
      try {
        // CRITICAL: Use functional update to ensure complete state clearing
        setProperties(() => {
          console.log('DEBUG: Clearing properties state for portfolio:', currentPortfolio);
          return [];
        });
        setApplicationCounts(() => ({ total: 0, pending: 0 }));
        setLoading(true);
        
        // Validate portfolio ownership if specific portfolio is selected
        if (currentPortfolio !== 'everything') {
          const isValidPortfolio = await validatePortfolioOwnership(currentPortfolio);
          if (!isValidPortfolio) {
            console.error('LandlordDashboard: Invalid portfolio access attempted:', currentPortfolio);
            toast({
              title: "Access Denied",
              description: "You don't have access to this portfolio",
              variant: "destructive"
            });
            navigate('/dashboard');
            return;
          }
        }
        
        // Fetch data for this portfolio
        console.log('DEBUG: Fetching data for portfolio:', currentPortfolio);
        await Promise.all([
          fetchProperties(currentPortfolio, hasPortfolioRole),
          fetchApplicationCounts(currentPortfolio, hasPortfolioRole)
        ]);
        console.log('LandlordDashboard: Dashboard initialization completed for portfolio:', currentPortfolio);
      } catch (error) {
        console.error('LandlordDashboard: Error during dashboard initialization:', error);
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    };

    // Only initialize when essential dependencies change
    if (user?.id) {
      initializeDashboard();
    }
    
    // Cleanup function to reset initialization state
    return () => {
      initializingRef.current = false;
    };
  }, [user?.id, currentPortfolio]); // Removed hasPortfolioRole from dependencies

  // Handle navigation from applications to messages
  useEffect(() => {
    console.info('🔍 [LandlordDashboard] Navigation state effect triggered:', { 
      state: location.state, 
      pathname: location.pathname, 
      search: location.search,
      currentPortfolio 
    });
    
    if (location.state?.activeTab) {
      console.info('🎯 [LandlordDashboard] Setting activeTab from navigation state:', location.state.activeTab);
      handleTabChange(location.state.activeTab);
      
      // Capture entry source before clearing state
      if (location.state.from) {
        setEntrySource(location.state.from);
      }
      
      if (location.state.activeTab === 'Profile') {
        console.info('📋 [LandlordDashboard] Setting profile init tab:', location.state.profileSubTab);
        const requestedTab = location.state.profileSubTab as 'profile' | 'documents' | 'subscriptions' | 'white-label' | undefined;
        
        // Guard: If subscriptions tab requested but feature disabled, fallback to profile
        if (requestedTab === 'subscriptions' && !featureFlags.landlordSubscriptionUiEnabled) {
          console.warn('⚠️ Subscriptions tab requested but feature disabled, falling back to profile tab');
          setProfileInitTab('profile');
        } else {
          setProfileInitTab(requestedTab);
        }
      }
      if (location.state.applicationId || location.state.tenantIdToSelect || location.state.action) {
        console.info('💬 [LandlordDashboard] Setting message init:', { applicationId: location.state.applicationId, tenantId: location.state.tenantIdToSelect, action: location.state.action });
        setMessageInit({ applicationId: location.state.applicationId, tenantId: location.state.tenantIdToSelect, action: location.state.action });
      }
      // CRITICAL FIX: Preserve search params when clearing state
      console.info('🧹 [LandlordDashboard] Clearing navigation state while preserving search params');
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
    }
  }, [location.state, navigate, currentPortfolio]);

  // Listen for real-time property changes from React Query
  useEffect(() => {
    const handlePropertiesChanged = () => {
      console.log('LandlordDashboard: Received properties-changed event, fetching properties');
      fetchProperties(currentPortfolio, hasPortfolioRole);
    };
    
    window.addEventListener('properties-changed', handlePropertiesChanged);
    return () => window.removeEventListener('properties-changed', handlePropertiesChanged);
  }, [currentPortfolio, hasPortfolioRole, fetchProperties]);

  // Calculate dashboard statistics with unit-level status counting
  const totalProperties = deduplicatedProperties.length;
  // Get all units from all properties
  const allUnits = deduplicatedProperties.flatMap(p => p.property_units || []);
  const totalUnits = allUnits.length || deduplicatedProperties.reduce((sum, p) => sum + (p.unit_count || 1), 0);
  const occupiedUnits = allUnits.filter(u => u.status === 'occupied').length;
  const vacantUnits = allUnits.filter(u => u.status === 'vacant').length;
  const availableUnits = allUnits.filter(u => u.status === 'available').length;
  
  // DEBUG: Log property_units data to diagnose occupancy calculation issues
  console.log('🔍 DEBUG OCCUPANCY:', {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    availableUnits,
    allUnitsWithStatus: allUnits.map(u => ({ id: u.id, status: u.status, unit_number: u.unit_number })),
    propertiesWithUnits: deduplicatedProperties.slice(0, 3).map(p => ({
      id: p.id,
      address: p.address,
      unitCount: p.unit_count,
      property_units: p.property_units?.map((u: any) => ({ id: u.id, status: u.status }))
    }))
  });
  
  // Calculate monthly rent from unit-level data first, fallback to property-level
  const unitLevelRent = allUnits.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);
  const propertyLevelRent = deduplicatedProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
  const monthlyRent = unitLevelRent > 0 ? unitLevelRent : propertyLevelRent;
  
  // Cash flow: rent minus expenses (only subtracts if expenses are entered)
  const cashFlow = deduplicatedProperties.reduce((sum, p) => {
    // Use unit-level rent for this property if available
    const propertyUnits = p.property_units || [];
    const unitRent = propertyUnits.reduce((uSum: number, u: any) => uSum + (u.monthly_rent || 0), 0);
    const rent = unitRent > 0 ? unitRent : (p.monthly_rent || 0);
    const expenses = (p.insurance_cost || 0) + (p.mortgage_cost || 0) + (p.management_fee || 0) + (p.repair_costs || 0);
    return sum + (rent - expenses);
  }, 0);

  const PM_ONLY_TABS = ['Analytics', 'Lease Expirations', 'Maintenance', 'Payments', 'My Rewards'];

  const allMenuItems = [
    { name: 'Dashboard', label: t('landlordDashboard.tabs.dashboard'), icon: Home, count: 0 },
    { name: 'Analytics', label: t('landlordDashboard.tabs.analytics'), icon: BarChart3, count: 0 },
    { name: 'Lease Expirations', label: t('landlordDashboard.tabs.leaseExpirations'), icon: Calendar, count: 0 },
    { name: 'Properties', label: t('landlordDashboard.tabs.properties'), icon: Building, count: 0 },
    { name: 'Maintenance', label: t('landlordDashboard.tabs.maintenance'), icon: Wrench, count: 0 },
    { name: 'Payments', label: t('landlordDashboard.tabs.payments'), icon: DollarSign, count: 0 },
    { name: 'Tenants/Applications', label: t('landlordDashboard.tabs.tenantsApplications'), icon: Users, count: 0 },
    
    { name: 'My Rewards', label: t('landlordDashboard.tabs.myRewards'), icon: Crown, count: 0 }
  ];

  const menuItems = pmEnabled
    ? allMenuItems
    : allMenuItems.filter(item => !PM_ONLY_TABS.includes(item.name));

  // If user is currently on a PM-only tab and PM mode flips off, snap back to Dashboard
  useEffect(() => {
    if (!pmEnabled && PM_ONLY_TABS.includes(activeTab)) {
      setActiveTab('Dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmEnabled]);

  const handleRecentPropertyClick = (property: any) => {
    handleTabChange('Properties');
  };

  const handleMapPropertyClick = (property: any) => {
    console.log('🗺️ Landlord map property "View Full Details" clicked:', property.id);
    // Only show the full details modal when "View Full Details" is clicked from popup
    setSelectedProperty(property);
    setSelectedMapProperty(property);
    setShowPropertyDetails(true);
  };

  const handleCardClick = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleRefreshDashboard = () => {
    fetchProperties(currentPortfolio, hasPortfolioRole);
    toast({
      title: "Refreshing dashboard",
      description: "Updating your data...",
    });
  };

  const handleRefreshLease = () => {
    setLeaseRefreshKey(prev => prev + 1);
    toast({
      title: "Refreshing lease data",
      description: "Updating lease expirations...",
    });
  };

  const handleRefreshMaintenance = () => {
    setMaintenanceRefreshKey(prev => prev + 1);
    toast({
      title: "Refreshing maintenance data",
      description: "Updating maintenance requests...",
    });
  };

  const refreshApplications = () => {
    setApplicationsRefreshKey(prev => prev + 1);
  };

  // Header component for all views
  // Reusable mobile-friendly tab navigation
  // Tour state for dashboard page — variant follows PM mode
  const tourVariant = pmEnabled ? 'pm' : 'listing';
  const tourState = useTourState('dashboard', tourVariant);

  const renderTabNav = () => (
    <div className="command-tabs mb-8 overflow-x-auto md:overflow-hidden max-w-full">
      <nav className="flex overflow-x-auto min-w-max md:min-w-0 md:w-full p-1">
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          // Generate data-tour attribute based on tab name
          const tourAttribute = `tab-${item.name.toLowerCase().replace(/\s+/g, '-').replace('/', '-')}`;
          return (
            <button
              key={item.name}
              data-tour={tourAttribute}
              onClick={() => handleTabChange(item.name)}
              className={`
                flex-shrink-0 
                flex items-center justify-center gap-1 sm:gap-2 
                px-3 sm:px-4 py-3 
                text-sm font-medium rounded-md 
                min-w-[56px] sm:min-w-0 sm:flex-1
                transition-all duration-200 
                ${activeTab === item.name
                  ? 'bg-gradient-blue-gold text-white shadow-sm'
                  : 'text-foreground hover:bg-muted'
                } 
                ${index > 0 ? 'ml-1' : ''}
              `}
            >
              <IconComponent className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
              {item.count > 0 && (
                <Badge variant="secondary" className="ml-1 bg-openkey-gold text-white h-5 px-2 text-xs hidden sm:flex">
                  {item.count > 99 ? '99+' : item.count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderHeader = () => (
    <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative flex items-center py-3 sm:py-4 min-h-[60px] sm:min-h-[72px]">
          {/* Left Section - Back arrow (mobile only) + Brand */}
          <div className="flex items-center gap-2">
            {/* Back arrow - Mobile only */}
            <button 
              onClick={() => navigate('/portfolio-select')}
              className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Back to portfolio selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="text-xl sm:text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
            >
              OpenKey
            </button>
          </div>

          {/* Center Section - Portfolio Management (Hidden on mobile, Absolutely centered on desktop) */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2" data-tour="portfolio-selector">
            <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <PortfolioSelectorDropdown
                selectedPortfolio={currentPortfolio}
                onPortfolioChange={(newPortfolioId) => {
                  console.log('DEBUG: Portfolio changed via dropdown:', newPortfolioId);
                  if (newPortfolioId === 'everything') {
                    navigate('/dashboard');
                  } else {
                    navigate(`/dashboard?portfolioId=${newPortfolioId}`);
                  }
                }}
                userId={user.id}
                showBackButton={true}
              />
            </div>
          </div>
          
          {/* Right Section - Action Buttons */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Pro Badge */}
            {hasActiveSubscription && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-semibold shadow-sm">
                <Crown className="w-4 h-4" />
                <span className="hidden lg:inline">Landlord Pro</span>
              </div>
            )}

            {/* Individual Navigation Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Currency Toggle - Compact icon style, Desktop only */}
              <div className="hidden lg:block">
                <CurrencyToggle 
                  value={currency}
                  onChange={setCurrency}
                  compact
                />
              </div>
              
              {/* Theme Toggle */}
              <ThemeToggle className="hidden sm:flex" />
              
              <ActiveGrantIndicator />
              
              {/* Combined Inbox Button (Notifications + Messages) */}
              <CombinedInboxButton portfolioId={currentPortfolio} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                  <DropdownMenuItem 
                    onClick={() => navigate(`/dashboard?portfolioId=${currentPortfolio}`, { state: { activeTab: 'Profile' } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/payment-settings')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Payment Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/user-roles?portfolioId=${currentPortfolio}`)}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    User/Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/section-8')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Section 8
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile-only Portfolio Selector */}
      <div className="md:hidden px-4 pb-3 border-t border-border/50 pt-2">
        <PortfolioSelectorDropdown
          selectedPortfolio={currentPortfolio}
          onPortfolioChange={(newPortfolioId) => {
            if (newPortfolioId === 'everything') {
              navigate('/dashboard');
            } else {
              navigate(`/dashboard?portfolioId=${newPortfolioId}`);
            }
          }}
          userId={user.id}
          showBackButton={false}
        />
      </div>
    </header>
  );

  // Shared Product Tour renderer - ensures tour is mounted across all tabs
  const renderProductTour = () => (
    <ProductTour
      page="dashboard"
      variant={tourVariant}
      isRunning={tourState.isRunning}
      currentStep={tourState.currentStep}
      onStepChange={tourState.setStep}
      onComplete={tourState.completeTour}
      onSkip={tourState.skipTour}
      onStop={tourState.stopTour}
    />
  );

  // Profile view
  if (activeTab === 'Profile') {
    return (
      <AnimatedBackground>
        {renderHeader()}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LandlordProfile
            user={user}
            profile={profile}
            onBack={() => {
              if (entrySource === 'portfolio-select') {
                navigate('/dashboard');
              } else {
                handleTabChange('Dashboard');
              }
            }}
            variant="embedded"
            initialTab={profileInitTab}
            entrySource={entrySource}
          />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  // Subscriptions view
  if (activeTab === 'Subscriptions') {
    return (
      <AnimatedBackground>
        {renderHeader()}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubscriptionManager userId={user.id} userType={profile?.user_type || 'landlord'} />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }


  // Add Payments view handling
  if (activeTab === 'Payments') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          <PaymentsTabContainer userId={user.id} portfolioId={currentPortfolio} />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  // Add My Rewards view handling
  if (activeTab === 'My Rewards') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {renderTabNav()}

          <LandlordPointsSection userId={user.id} />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }



  if (activeTab === 'Properties') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          {/* Minimalist Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="command-section-header mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="command-section-icon">
                    <Building className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-openkey-blue">Properties</h1>
                    <p className="text-muted-foreground text-lg">Comprehensive management of your real estate investments</p>
                  </div>
                </div>
                
                {/* Show Add Property button for everything view or users with admin_partner/editor roles */}
                {(currentPortfolio === 'everything' || (hasPortfolioRole && hasRole(['admin_partner', 'editor']))) && (
                  <Button 
                    onClick={() => setShowAddProperty(true)}
                    className="btn-command-primary w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                )}
              </div>
              
              {/* Stats Row — listing mode hides PM-only metrics (occupancy %, revenue) */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-openkey-blue flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">{portfolioOverview?.total_units || totalProperties}</div>
                    <div className="text-muted-foreground text-xs sm:text-sm">Total Properties</div>
                  </div>
                </div>
                {pmEnabled ? (
                  <>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-success flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">{Math.round(((totalUnits - vacantUnits) / totalUnits * 100) || 0)}%</div>
                        <div className="text-muted-foreground text-xs sm:text-sm">Occupancy Rate</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-openkey-gold flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">${monthlyRent.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs sm:text-sm">Monthly Revenue</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-openkey-blue flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">{totalUnits}</div>
                        <div className="text-muted-foreground text-xs sm:text-sm">Total Units</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-success flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                          {deduplicatedProperties.filter((p: any) => p.listing_status === 'on_market').length}
                        </div>
                        <div className="text-muted-foreground text-xs sm:text-sm">Active Listings</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Listing mode: lean 4-card row (no NOI / cash flow / collection rate) */}
          {!pmEnabled && (
            <div className="mb-8">
              <ListingOverviewCards
                totalListings={portfolioOverview?.total_units || totalProperties}
                activeListings={deduplicatedProperties.filter((p: any) => p.listing_status === 'on_market').length}
                newMatches={0}
                pendingApplications={0}
              />
            </div>
          )}

          {/* PM mode: full enhanced overview metrics */}
          {pmEnabled && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
          >
            <AnimatedCard index={0}>
              <CardEnhanced 
                variant="command" 
                hover
                className="command-bento-card relative overflow-hidden"
                onClick={() => handleCardClick('Total Units')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220_100%_50%/0.05)] to-transparent pointer-events-none" />
                <CardEnhancedContent className="relative z-10 p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="command-section-icon">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-openkey-blue text-white">
                      <Home className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                    <p className="text-3xl font-bold text-openkey-blue">
                      {portfolioOverview?.total_units || totalUnits}
                    </p>
                    <p className="text-sm text-muted-foreground">Property portfolio</p>
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            </AnimatedCard>
            
            <AnimatedCard index={1}>
              <CardEnhanced 
                variant="command" 
                hover
                className="command-bento-card relative overflow-hidden"
                onClick={() => handleCardClick('Occupied Units')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(186_100%_50%/0.05)] to-transparent pointer-events-none" />
                <CardEnhancedContent className="relative z-10 p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="command-section-icon">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="occupied" className="text-xs">
                      <UserIcon className="w-3 h-3 mr-1" />
                      Occupied
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Occupied Units</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {occupiedUnits}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Occupancy Rate:</span>
                      <span className="font-semibold px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-600">
                        {Math.round(totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0)}%
                      </span>
                    </div>
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            </AnimatedCard>
            
            <AnimatedCard index={2}>
              <CardEnhanced 
                variant="command" 
                hover
                className="command-bento-card relative overflow-hidden"
                onClick={() => handleCardClick('Monthly Rent Collection')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45_85%_50%/0.05)] to-transparent pointer-events-none" />
                <CardEnhancedContent className="relative z-10 p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="command-section-icon">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="warning" className="text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Monthly
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                    <p className="text-3xl font-bold text-openkey-gold">
                      ${(portfolioOverview?.gross_rent || monthlyRent).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Collection Rate:</span>
                      <span className="font-semibold px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                        {Math.round(portfolioOverview?.collection_rate || 95)}%
                      </span>
                    </div>
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            </AnimatedCard>
            
            <AnimatedCard index={3}>
              <CardEnhanced 
                variant="command" 
                hover
                className="command-bento-card relative overflow-hidden"
                onClick={() => handleCardClick('Cash Flow Analysis')}
              >
                <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${
                  (portfolioOverview?.net_operating_income || cashFlow) >= 0 
                    ? 'from-[hsl(142_71%_45%/0.05)]' 
                    : 'from-[hsl(0_84%_60%/0.05)]'
                } to-transparent`} />
                <CardEnhancedContent className="relative z-10 p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`command-section-icon ${(portfolioOverview?.net_operating_income || cashFlow) < 0 ? '!bg-destructive' : ''}`}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <Badge 
                      variant={(portfolioOverview?.net_operating_income || cashFlow) >= 0 ? 'success' : 'destructive'} 
                      className="text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      NOI
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Cash Flow</p>
                    <div className="flex items-center justify-between">
                      <p className={`text-3xl font-bold ${
                        (portfolioOverview?.net_operating_income || cashFlow) >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        ${Math.abs(portfolioOverview?.net_operating_income || cashFlow).toLocaleString()}
                      </p>
                      <Sparkline 
                        positive={(portfolioOverview?.net_operating_income || cashFlow) >= 0} 
                        width={80}
                        height={32}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Net Operating Income</p>
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            </AnimatedCard>
          </motion.div>
          )}

          <PortfolioExport userId={user.id} portfolioId={currentPortfolio} />

          {/* Property Geocoding Section */}
          {deduplicatedProperties.length > 0 && deduplicatedProperties.some(p => !p.latitude || !p.longitude) && (
            <div className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <MapPin className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Enable Map View</h3>
                        <p className="text-sm text-gray-600">
                          Add coordinates to your properties to see them on the interactive map
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {deduplicatedProperties.filter(p => !p.latitude || !p.longitude).length} properties need coordinates
                        </p>
                      </div>
                    </div>
                    <PropertyGeocoder />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Tenant Details Modal */}
          {selectedTenantProperty && (
            <TenantDetailsModal
              isOpen={!!selectedTenantProperty}
              onClose={() => setSelectedTenantProperty(null)}
              propertyId={selectedTenantProperty.id}
              propertyAddress={selectedTenantProperty.address}
            />
          )}

          {/* Rent Setup Modal */}
          {selectedRentSetupProperty && (
            <RentSplitForm
              property={selectedRentSetupProperty}
              onClose={() => setSelectedRentSetupProperty(null)}
              onSaved={() => {
                setSelectedRentSetupProperty(null);
                fetchProperties(currentPortfolio, hasPortfolioRole); // Refresh properties data
                toast({
                  title: "Success",
                  description: "Rent and payment configuration saved successfully"
                });
              }}
            />
          )}

          {/* Show Add Property modal for everything view or users with edit permissions */}
          {(currentPortfolio === 'everything' || (hasPortfolioRole && hasRole(['admin_partner', 'editor']))) && (
            <AddPropertyModal
              isOpen={showAddProperty}
              onClose={() => setShowAddProperty(false)}
              userId={user.id}
              userType={profile?.user_type || 'individual_owner'}
              onPropertyAdded={() => fetchProperties(currentPortfolio, hasPortfolioRole)}
              portfolioId={currentPortfolio === 'everything' ? 'everything' : portfolioId}
            />
          )}

          {/* Property Details Modal */}
          {showPropertyDetails && selectedProperty && (
            <LandlordPropertyDetailsModal
              property={selectedProperty}
              isOpen={showPropertyDetails}
              onClose={() => {
                setShowPropertyDetails(false);
                setSelectedProperty(null);
              }}
              onEdit={(property) => {
                // Only allow editing for admin_partner and editor roles
                if (hasRole(['admin_partner', 'editor'])) {
                  // Handle property editing logic here
                  console.log('Edit property:', property);
                }
              }}
              onViewApplications={(property) => {
                // Handle view applications logic here
                console.log('View applications for property:', property);
              }}
              onViewMessages={(property) => {
                // Handle view messages logic here
                console.log('View messages for property:', property);
              }}
            />
          )}

          <PropertyBreakdownModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            landlordId={user.id}
            portfolioId={currentPortfolio !== 'everything' ? currentPortfolio : undefined}
            title={modalTitle}
          />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  if (activeTab === 'Tenants/Applications') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          {/* Minimalist Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="command-section-header mb-8">
              <div className="flex items-center gap-4">
                <div className="command-section-icon">
                  <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-openkey-blue">Tenants & Applications</h1>
                  <p className="text-muted-foreground text-lg mt-1">Manage tenant applications and current tenants</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <LandlordApplications 
              userId={user.id} 
              portfolioId={currentPortfolio}
              selectedPropertyId={selectedProperty?.id}
              onClearPropertyFilter={() => setSelectedProperty(null)}
              externalRefreshKey={applicationsRefreshKey}
            />
          </motion.div>
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  if (showTenantAnalytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => {
                  setShowTenantAnalytics(false);
                  handleTabChange('Properties');
                }}
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-black mb-2">Tenant Analytics</h2>
                <p className="text-gray-600 text-lg">Comprehensive tenant and lease analytics</p>
              </div>
            </div>
          </div>

          <TenantLeaseAnalyticsHub
            landlordId={user.id}
            portfolioId={portfolioId}
          />
          {renderProductTour()}
        </main>
      </div>
    );
  }

  // Operational Performance Analytics view
  if (showOperationalPerformance) {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowOperationalPerformance(false)}
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-black mb-2">Operational Performance</h2>
                <p className="text-gray-600 text-lg">Comprehensive operational efficiency and performance analytics</p>
              </div>
            </div>
          </div>

          <OperationalPerformanceDashboard
            portfolioId={portfolioId || 'everything'}
            currentUserId={user.id}
            onBack={() => setShowOperationalPerformance(false)}
          />
          {renderProductTour()}
        </main>
      </div>
    );
  }

  // Financial Performance Analytics view
  if (showFinancialPerformance) {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowFinancialPerformance(false)}
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-black mb-2">Financial Performance</h2>
                <p className="text-gray-600 text-lg">Comprehensive financial performance and profitability analytics</p>
              </div>
            </div>
          </div>

          <FinancialPerformanceHub
            landlordId={user.id}
            portfolioId={portfolioId || 'everything'}
          />
          {renderProductTour()}
        </main>
      </div>
    );
  }

  // Predictive Analytics view
  if (showPredictiveAnalytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowPredictiveAnalytics(false)}
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-black mb-2">Predictive Analytics</h2>
                <p className="text-gray-600 text-lg">AI-powered insights and forecasting for business intelligence</p>
              </div>
            </div>
          </div>

          <PredictiveAnalyticsHub
            landlordId={user.id}
            portfolioId={portfolioId || 'everything'}
          />
          {renderProductTour()}
        </main>
      </div>
    );
  }

  if (activeTab === 'Messages') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => {
                  if (entrySource === 'portfolio-select') {
                    if (portfolioId && portfolioId !== 'everything') {
                      navigate(`/dashboard?portfolioId=${portfolioId}`);
                    } else {
                      navigate('/dashboard');
                    }
                  } else if (entrySource === 'portfolio-dashboard') {
                    setActiveTab(previousTab || 'Dashboard');
                  } else {
                    setActiveTab(previousTab || 'Dashboard');
                  }
                }}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Messages</h2>
                <p className="text-muted-foreground text-lg">Chat with tenants and manage conversations</p>
              </div>
            </div>
          </div>

          <LandlordMessages
            userId={user.id} 
            initialApplicationId={messageInit?.applicationId}
            initialTenantId={messageInit?.tenantId}
            initialAction={messageInit?.action}
          />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  if (activeTab === 'Maintenance') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          {/* Minimalist Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="command-section-header mb-8">
              <div className="flex items-center gap-4">
                <div className="command-section-icon">
                  <Wrench className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-openkey-blue">Maintenance Requests</h1>
                  <p className="text-muted-foreground text-lg mt-1">Track and manage property maintenance efficiently</p>
                </div>
              </div>
            </div>
          </motion.div>

          <MaintenanceRequests userId={user.id} portfolioId={currentPortfolio} key={maintenanceRefreshKey} />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  if (activeTab === 'Analytics') {
    return (
      <AnimatedBackground>
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          <LandlordAnalyticsDashboard 
            landlordId={user.id} 
            portfolioId={portfolioId} 
          />
          {renderProductTour()}
        </main>
      </AnimatedBackground>
    );
  }

  if (activeTab === 'Lease Expirations') {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabNav()}

          <div className="bg-gradient-blue-gold text-white relative overflow-hidden rounded-lg mb-8">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative px-6 py-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">Lease Expirations</h1>
                  <p className="text-white/80 text-lg">Monitor upcoming lease renewals</p>
                </div>
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <LeaseExpirations 
            key={leaseRefreshKey} 
            userId={user.id} 
            portfolioId={currentPortfolio}
            defaultTab={(new URLSearchParams(location.search).get('subTab') ?? undefined) as 'overview' | 'expirations' | 'renewals' | undefined}
          />
          {renderProductTour()}
        </main>
      </div>
    );
  }


  if (loading) {
    return (
      <AnimatedBackground showOrbs={false}>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-12 h-12 border-4 border-openkey-blue/20 border-t-openkey-blue rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground font-medium">Loading dashboard...</p>
          </motion.div>
        </div>
      </AnimatedBackground>
    );
  }

  // Main Dashboard View
  return (
    <AnimatedBackground>
      {renderHeader()}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {renderTabNav()}

        {/* Minimalist Dashboard Hero - Only show on Dashboard tab */}
        {activeTab === 'Dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="command-section-header mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-4">
                  <div className="command-section-icon">
                    <Home className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-openkey-blue">
                      {portfolioName ? `${portfolioName} Dashboard` : 'Landlord Dashboard'}
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-lg">
                      {portfolioName 
                        ? `Managing portfolio: ${portfolioName}` 
                        : `Welcome back, ${profile?.first_name || 'Demo'} ${profile?.last_name || 'User'}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <PermissionGuard
                    object="properties"
                    action="create"
                    scope="portfolio"
                    portfolioId={currentPortfolio !== 'everything' ? currentPortfolio : ''}
                    showDeniedMessage={false}
                  >
                    <Button 
                      onClick={() => setShowAddProperty(true)}
                      className="btn-command-primary w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Property
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Property Limit Warning */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <PropertyLimitWarning 
            userId={user.id} 
            userType={profile?.user_type || 'individual_owner'}
            portfolioId={currentPortfolio}
          />
        </motion.div>

        {/* Section Label */}
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="command-section-label mb-6 block"
        >
          {pmEnabled ? 'Portfolio Overview' : 'Listing Overview'}
        </motion.span>

        {/* Listing mode: simplified 4-card row, no NOI/cash flow */}
        {!pmEnabled && (
          <ListingOverviewCards
            totalListings={portfolioOverview?.total_units || totalProperties}
            activeListings={deduplicatedProperties.filter((p: any) => p.listing_status === 'on_market').length}
            newMatches={0}
            pendingApplications={0}
          />
        )}

        {/* PM mode: full bento with NOI + Cash Flow */}
        {pmEnabled && user?.id && (
          <div className="mb-6">
            <EnrollmentTimelineConnected userId={user.id} userEmail={user.email ?? null} />
          </div>
        )}
        {pmEnabled && (
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" 
          data-tour="dashboard-metrics"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
          }}
        >
          {/* The Everything Card - Spans 2 columns */}
          <AnimatedCard index={0} className="lg:col-span-2">
            <TheEverythingCard
              totalUnits={portfolioOverview?.total_units || totalProperties}
              occupiedUnits={occupiedUnits}
              monthlyRent={portfolioOverview?.gross_rent || monthlyRent}
              netOperatingIncome={portfolioOverview?.net_operating_income || cashFlow}
            />
          </AnimatedCard>
          
          {/* Cash Flow Card with Sparkline - Single column */}
          <AnimatedCard index={1}>
            <CardEnhanced 
              variant="command" 
              hover
              className="command-bento-card relative overflow-hidden h-full"
            >
              {/* Green/Red gradient overlay based on cash flow */}
              <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${
                (portfolioOverview?.net_operating_income || cashFlow) >= 0 
                  ? 'from-[hsl(142_71%_45%/0.05)]' 
                  : 'from-[hsl(0_84%_60%/0.05)]'
              } to-transparent`} />
              <CardEnhancedContent className="relative z-10 p-8 h-full flex flex-col justify-between">
                <div>
                  <span className="command-section-label">Cash Flow</span>
                  <div className="flex items-center justify-between mt-4 mb-4">
                    <div className={`command-section-icon ${(portfolioOverview?.net_operating_income || cashFlow) < 0 ? '!bg-destructive' : ''}`}>
                      <TrendingUp className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </div>
                    <Badge 
                      variant={(portfolioOverview?.net_operating_income || cashFlow) >= 0 ? 'success' : 'destructive'} 
                      className="text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      NOI
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <p className={`text-4xl font-bold tracking-tight ${
                      (portfolioOverview?.net_operating_income || cashFlow) >= 0 
                        ? 'text-success' 
                        : 'text-destructive'
                    }`}>
                      ${Math.abs(portfolioOverview?.net_operating_income || cashFlow).toLocaleString()}
                    </p>
                    <Sparkline 
                      positive={(portfolioOverview?.net_operating_income || cashFlow) >= 0} 
                      width={80}
                      height={36}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Net Operating Income</p>
                  
                  {/* Collection Rate */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Collection Rate</span>
                    <span className="font-semibold px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                      {Math.round(portfolioOverview?.collection_rate || 95)}%
                    </span>
                  </div>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          </AnimatedCard>
        </motion.div>
        )}

        {/* Section Label */}
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="command-section-label mb-6 block"
        >
          Activity & Actions
        </motion.span>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Recent Activity - Now on the left with 2 columns */}
          <div className="lg:col-span-2 flex flex-col" data-tour="activity-feed">
            <PointsActivityFeed 
              activities={pointsActivities}
              isLoading={pointsLoading}
            />
          </div>

          {/* Quick Actions - Premium Bento Card */}
          <AnimatedCard index={0} delay={0.4} className="flex flex-col h-[500px]" data-tour="quick-actions">
            <QuickActionsBento
              mode={pmEnabled ? 'pm' : 'listing'}
              onAddProperty={() => setShowAddProperty(true)}
              onAddAsset={() => {
                handleTabChange('Analytics');
                navigate(`/dashboard?portfolioId=${currentPortfolio}&tab=assets`);
              }}
              onManagePayments={() => navigate('/payment-settings?tab=methods')}
              onManageRoles={() => {
                if (currentPortfolio === 'everything') {
                  navigate(`/user-roles?portfolioId=everything`);
                } else {
                  navigate(`/portfolio/${currentPortfolio}/settings?tab=team`);
                }
              }}
              onViewApplications={() => handleTabChange('Tenants/Applications')}
              onOpenSettings={() => navigate(`/portfolio/${currentPortfolio}/settings`)}
              onViewProperties={() => handleTabChange('Properties')}
              onViewMatches={() => handleTabChange('Tenants/Applications')}
              onImportCsv={() => navigate(`/property-import?portfolioId=${currentPortfolio}`)}
            />
          </AnimatedCard>
        </motion.div>

        <AddPropertyModal
          isOpen={showAddProperty}
          onClose={() => setShowAddProperty(false)}
          userId={user.id}
          userType={profile?.user_type || 'individual_owner'}
          onPropertyAdded={() => fetchProperties(currentPortfolio, hasPortfolioRole)}
          portfolioId={currentPortfolio === 'everything' ? 'everything' : portfolioId}
        />

        <PropertyBreakdownModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          landlordId={user.id}
          portfolioId={currentPortfolio !== 'everything' ? currentPortfolio : undefined}
          title={modalTitle}
        />

        {/* Add Asset Wizard — PM-only feature */}
        {pmEnabled && (
          <AddAssetWizard
            portfolioId={portfolioId!}
            isOpen={showAssetWizard}
            onOpenChange={(open) => {
              console.log('🎪 [LandlordDashboard] AddAssetWizard state change:', { open, portfolioId });
              setShowAssetWizard(open);
            }}
            onAssetAdded={() => {
              console.log('✅ [LandlordDashboard] Asset added, closing wizard and refreshing properties');
              setShowAssetWizard(false);
              fetchProperties(currentPortfolio, hasPortfolioRole);
            }}
          />
        )}

        {/* Portfolio Invite Dialog */}
        {portfolioId && (
          <PortfolioInviteDialog
            isOpen={showPortfolioInvite}
            onClose={() => setShowPortfolioInvite(false)}
            portfolioId={portfolioId}
          />
        )}

        {/* Product Tour */}
        <ProductTour
          page="dashboard"
          variant={tourVariant}
          isRunning={tourState.isRunning}
          currentStep={tourState.currentStep}
          onStepChange={tourState.setStep}
          onComplete={tourState.completeTour}
          onSkip={tourState.skipTour}
          onStop={tourState.stopTour}
        />
      </main>
    </AnimatedBackground>
  );
}

export default LandlordDashboard;
