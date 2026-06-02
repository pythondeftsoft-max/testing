import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogOut, Settings, CreditCard, Home, Users, Calendar, DollarSign, Bell, Crown, MessageSquare, User, Award, CheckCircle, Clock, AlertTriangle, Search, MapPin, FileText, Info, HelpCircle, History } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import PropertySearch from '@/components/PropertySearch';

import SubscriptionManager from '@/components/SubscriptionManager';
import TenantMaintenanceRequests from '@/components/TenantMaintenanceRequests';
import TenantMaintenanceDashboard from '@/components/TenantMaintenanceDashboard';
import PropertyAssociationStatus from '@/components/PropertyAssociationStatus';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentData } from '@/hooks/usePaymentData';
import { ReferralRewards } from '@/components/ReferralRewards';
import { MonthlyRentBreakdown } from '@/components/MonthlyRentBreakdown';
import { LeaseRenewalMeter } from '@/components/LeaseRenewalMeter';
import TenantLeaseRenewals from '@/components/TenantLeaseRenewals';
import PointsTab from '@/components/PointsTab';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { RentPointsAlert } from '@/components/RentPointsAlert';
import TenantMatchProposal from '@/components/tenant/TenantMatchProposal';
import SavedPropertiesList from '@/components/SavedPropertiesList';
import { RentPaymentsSubTabs } from '@/components/payments/RentPaymentsSubTabs';
import { RentPointsRewardsCard } from '@/components/payments/RentPointsRewardsCard';

import RentHistoryTab from '@/components/rent-tracking/RentHistoryTab';
import { useHasTenantMemberships } from '@/hooks/useUserMemberships';
import { useTenantApplications } from '@/hooks/useTenantApplications';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';


// Component to display the amount due with HAP/tenant breakdown
const AmountDueDisplay = ({ properties, userId }: { properties: any[], userId: string | null }) => {
  const firstProperty = properties?.[0];
  
  // Move hook BEFORE early return to fix hooks order violation
  const { rentSplits } = usePaymentData(firstProperty?.id || '', userId || '');
  
  if (!firstProperty || !userId) {
    return <p className="text-xl font-bold text-openkey-blue">$1,200</p>;
  }
  
  if (rentSplits && typeof rentSplits === 'object' && 'tenant_portion' in rentSplits) {
    // Show only tenant portion, no processing fee (fee is shown on payment page)
    const tenantPortion = rentSplits.tenant_portion as number;
    // Check if tenantPortion is a valid number before calling toFixed
    if (tenantPortion != null && !isNaN(tenantPortion)) {
      return <p className="text-xl font-bold text-openkey-blue">${tenantPortion.toFixed(0)}</p>;
    }
  }
  
  // Fall back to full rent amount
  return <p className="text-xl font-bold text-openkey-blue">${firstProperty.monthly_rent?.toLocaleString() || '1,200'}</p>;
};

// Component to display next payment due date and status
const NextPaymentDueDisplay = ({ properties, userId }: { properties: any[], userId: string | null }) => {
  const firstProperty = properties?.[0];
  
  // Query for completed payments this month
  const { data: paidThisMonth } = useQuery({
    queryKey: ['paid-this-month', firstProperty?.id, userId],
    queryFn: async () => {
      if (!firstProperty?.id || !userId) return false;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const { data } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('property_id', firstProperty.id)
        .eq('tenant_id', userId)
        .eq('status', 'completed')
        .gte('payment_date', startOfMonth.toISOString().split('T')[0])
        .lte('payment_date', endOfMonth.toISOString().split('T')[0])
        .limit(1);
      
      return (data?.length || 0) > 0;
    },
    enabled: !!firstProperty?.id && !!userId,
  });
  
  // Move hook BEFORE early return to fix hooks order violation
  const { balance, property, rentSplits, isLoading, error } = usePaymentData(
    firstProperty?.id || '', 
    userId || ''
  );
  
  if (!firstProperty || !userId) {
    // Show realistic demo date for next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    const demoDate = nextMonth.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return (
      <>
        <p className="text-2xl font-bold text-openkey-blue mb-2">{demoDate}</p>
        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
          Upcoming
        </Badge>
      </>
    );
  }
  
  // Handle loading states
  if (isLoading) {
    return (
      <>
        <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
        <div className="h-6 bg-muted rounded animate-pulse w-20"></div>
      </>
    );
  }
  
  // Handle error states
  if (error) {
    return (
      <>
        <p className="text-2xl font-bold text-muted-foreground mb-2">--</p>
        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
          Error Loading
        </Badge>
      </>
    );
  }
  
  let dueDate: Date;
  let dueDateString: string;
  
  // Prioritize property.rent_due_day (source of truth from recurring_charges) over balance
  if (property?.rent_due_day) {
    // Calculate next payment based on rent_due_day from recurring_charges
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const rentDueDay = property.rent_due_day;
    
    dueDate = new Date(currentYear, currentMonth, rentDueDay);
    
    // If the due date already passed this month OR already paid this month, move to next month
    if (dueDate <= today || paidThisMonth) {
      dueDate = new Date(currentYear, currentMonth + 1, rentDueDay);
    }
    
    dueDateString = dueDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } else if (balance?.current_due_date) {
    // Fallback to balance data if rent_due_day not available
    dueDate = new Date(balance.current_due_date);
    // If paid this month, move to next month
    if (paidThisMonth) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    dueDateString = dueDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } else {
    // Final fallback: first of next month
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    dueDate = nextMonth;
    dueDateString = nextMonth.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  // Calculate days until due and determine badge
  const today = new Date();
  const timeDiff = dueDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  let badge;
  
  if (daysDiff < 0) {
    // Overdue
    badge = <Badge variant="destructive" className="text-xs animate-pulse">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Overdue
    </Badge>;
  } else if (daysDiff === 0) {
    // Due today
    badge = <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50 animate-pulse">
      <Clock className="w-3 h-3 mr-1" />
      Due Today
    </Badge>;
  } else if (daysDiff <= 3) {
    // Due soon (within 3 days)
    badge = <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
      <Clock className="w-3 h-3 mr-1" />
      Due Soon
    </Badge>;
  } else if (daysDiff <= 7) {
    // Due this week
    badge = <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
      <Clock className="w-3 h-3 mr-1" />
      Due This Week
    </Badge>;
  } else {
    // Normal upcoming payment
    badge = <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
      Upcoming
    </Badge>;
  }
  
  return (
    <>
      <p className="text-2xl font-bold text-openkey-blue mb-2">{dueDateString}</p>
      {badge}
    </>
  );
};

// Component to display monthly rent breakdown
const MonthlyRentCard = ({ properties, userId, handleTabChange }: { properties: any[], userId: string | null, handleTabChange: (tab: string) => void }) => {
  const firstProperty = properties?.[0];
  
  if (!firstProperty || !userId) {
    return (
      <div className="space-y-3">
        <span className="text-lg font-semibold text-openkey-blue">Check Matches</span>
        <p className="text-sm text-muted-foreground">Your rent details will appear once you're placed</p>
        <Button 
          size="sm" 
          onClick={() => handleTabChange('My Matches')}
          className="w-full bg-openkey-blue hover:bg-openkey-blue-dark text-white"
        >
          <Search className="w-4 h-4 mr-2" />
          Check Matches
        </Button>
      </div>
    );
  }
  
  const { rentSplits, property, isLoading } = usePaymentData(firstProperty.id, userId);
  
  // Type guard for rentSplits
  const typedRentSplits = rentSplits && typeof rentSplits === 'object' && 'tenant_portion' in rentSplits 
    ? rentSplits as any 
    : null;
  
  return (
    <MonthlyRentBreakdown 
      property={property || firstProperty} 
      rentSplits={typedRentSplits}
      isLoading={isLoading}
    />
  );
};

// Component to display payment schedule with correct tenant amount and due day
const PaymentScheduleDisplay = ({ properties, userId }: { properties: any[], userId: string | null }) => {
  const firstProperty = properties?.[0];
  
  const { rentSplits, property } = usePaymentData(firstProperty?.id || '', userId || '');
  
  // Query for completed payments to determine which months are paid
  const { data: completedPayments } = useQuery({
    queryKey: ['completed-payments-schedule', firstProperty?.id, userId],
    queryFn: async () => {
      if (!firstProperty?.id || !userId) return [];
      
      const { data } = await supabase
        .from('rent_payments')
        .select('payment_date')
        .eq('property_id', firstProperty.id)
        .eq('tenant_id', userId)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(6);
      
      return data || [];
    },
    enabled: !!firstProperty?.id && !!userId,
  });
  
  const today = new Date();
  
  // Get tenant portion or fall back to monthly rent
  let rentAmount = properties?.[0]?.monthly_rent || 1200;
  if (rentSplits && typeof rentSplits === 'object' && 'tenant_portion' in rentSplits) {
    const tenantPortion = (rentSplits as any).tenant_portion;
    if (tenantPortion != null && !isNaN(tenantPortion)) {
      rentAmount = tenantPortion;
    }
  }
  
  // Get rent due day from property data (source of truth from recurring_charges)
  const rentDueDay = property?.rent_due_day || 1;
  
  // Determine which months are already paid
  const paidMonths = new Set(
    (completedPayments || []).map(p => {
      const d = new Date(p.payment_date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  
  const upcomingDates = [];
  let monthOffset = 0;
  
  // Find next 3 unpaid payment dates
  while (upcomingDates.length < 3 && monthOffset < 12) {
    const paymentDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, rentDueDay);
    
    // Skip if this date is in the past
    if (paymentDate <= today) {
      // Check if this month is already paid
      const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
      if (!paidMonths.has(monthKey)) {
        // Only show past unpaid dates
        upcomingDates.push(paymentDate);
      }
      monthOffset++;
      continue;
    }
    
    // For future dates, check if already paid
    const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
    if (!paidMonths.has(monthKey)) {
      upcomingDates.push(paymentDate);
    }
    monthOffset++;
  }
  
  return (
    <div className="space-y-1.5 text-sm text-foreground">
      {upcomingDates.map((date, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">•</span>
          <span>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${rentAmount.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// Component for Dashboard "Next Payment" card that uses correct rent_due_day
const DashboardNextPaymentCard = ({ 
  properties, 
  userId, 
  handleTabChange,
  handlePayRentClick 
}: { 
  properties: any[], 
  userId: string | null, 
  handleTabChange: (tab: string) => void,
  handlePayRentClick: () => void
}) => {
  const firstProperty = properties?.[0];
  
  // Query for completed payments this month
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  
  // Query for completed payments this month
  const { data: paidThisMonth } = useQuery({
    queryKey: ['dashboard-paid-this-month', firstProperty?.id, userId],
    queryFn: async () => {
      if (!firstProperty?.id || !userId) return false;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const { data } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('property_id', firstProperty.id)
        .eq('tenant_id', userId)
        .eq('status', 'completed')
        .gte('payment_date', startOfMonth.toISOString().split('T')[0])
        .lte('payment_date', endOfMonth.toISOString().split('T')[0])
        .limit(1);
      
      return (data?.length || 0) > 0;
    },
    enabled: !!firstProperty?.id && !!userId,
  });
  
  // Move usePaymentData BEFORE early return to fix hooks order violation
  const { property, isLoading } = usePaymentData(
    firstProperty?.id || '', 
    userId || ''
  );
  
  if (!firstProperty || !userId) {
    // Demo state for users without properties
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold group">
        <CardEnhancedHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Next Payment</CardEnhancedTitle>
            <div className="p-3 bg-violet-500 rounded-xl shadow-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent className="pt-0">
          <div className="space-y-3">
            <span className="text-lg font-semibold text-openkey-blue">Check Matches</span>
            <p className="text-sm text-muted-foreground">Payment schedule appears after placement</p>
            <Button 
              size="sm" 
              onClick={() => handleTabChange('My Matches')}
              className="w-full bg-openkey-blue hover:bg-openkey-blue-dark text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              Check Matches
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }
  
  // usePaymentData is now called before the early return (line 395)
  // Get rent due day from usePaymentData (source of truth from recurring_charges)
  const rentDueDay = property?.rent_due_day || 1;
  
  // Calculate next payment date using the correct day
  const today = new Date();
  let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay);
  
  // If the due date already passed this month OR already paid this month, move to next month
  if (today.getDate() > rentDueDay || paidThisMonth) {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, rentDueDay);
  }
  
  const daysUntil = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const dateString = nextPaymentDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold group">
        <CardEnhancedHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Next Payment</CardEnhancedTitle>
            <div className="p-3 bg-violet-500 rounded-xl shadow-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent className="pt-0">
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded animate-pulse"></div>
            <div className="h-6 bg-muted rounded animate-pulse w-32"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }
  
  return (
    <CardEnhanced variant="elevated" className="card-hover-gold group">
      <CardEnhancedHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Next Payment</CardEnhancedTitle>
          <div className="p-3 bg-violet-500 rounded-xl shadow-sm">
            <Calendar className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="pt-0">
        <div className="space-y-3">
          <div className="text-2xl font-bold text-openkey-blue">{dateString}</div>
          <div className="text-sm text-muted-foreground">
            {daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`}
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

interface TenantDashboardModernProps {
  user?: SupabaseUser | null;
}

const TenantDashboardModern: React.FC<TenantDashboardModernProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const activeTab = searchParams.get('tab') || 'Dashboard';
  
  // Use user prop from Dashboard (single auth source) instead of separate useAuth
  const userId = user?.id ?? null;
  
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  
  // Use React Query hook for applications
  const { data: applications = [], isLoading: applicationsLoading } = useTenantApplications(userId);
  
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  
  // Get subscription status
  const { hasActiveSubscription } = useSubscription(userId, 'tenant');

  // Profile completion check for existing tenants with missing data
  const { isComplete: isProfileComplete, missingFields, profile: completionProfile, isLoading: profileCheckLoading, refetch: refetchProfileCompletion } = useProfileCompletion(userId ?? undefined);

  // Get maintenance requests for the user's property
  const firstProperty = properties?.[0];
  const { requests: maintenanceRequests } = useMaintenanceRequests(firstProperty?.id);

  // Helper functions for calculating real data
  const calculateDaysUntilDate = (dateString: string | null): number => {
    if (!dateString) return 0;
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getActiveMaintenanceCount = (): number => {
    if (!maintenanceRequests) return 0;
    return maintenanceRequests.filter(req => req.status !== 'completed').length;
  };

  // Fetch tenant profile and properties when user is available (from cached auth)
  useEffect(() => {
    if (userId) {
      fetchTenantProfile(userId);
      fetchProperties(userId);
    }
  }, [userId]);

  // REMOVED: Aggressive 5-second polling - properties fetch on mount and 
  // React Query mutations auto-invalidate queries after user actions

  // Tab change handler
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Redirect old "Applied Homes" tab to new "Properties" tab for backward compatibility
  useEffect(() => {
    if (activeTab === 'Applied Homes') {
      setSearchParams({ tab: 'Properties' });
    }
  }, [activeTab, setSearchParams]);

  const fetchTenantProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tenant profile:', error);
      } else {
        setTenantProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching tenant profile:', error);
    }
  };

  // Removed fetchApplications - now handled by useTenantApplications hook

  const fetchProperties = async (userId: string) => {
    try {
      // Check BOTH old system (property_applications) AND new system (marketplace_applications)
      const [propertyAppsResult, marketplaceAppsResult] = await Promise.all([
        // Old system
        supabase
          .from('property_applications')
          .select('property_id, status')
          .eq('tenant_id', userId)
          .in('status', ['approved', 'housed'])
          .order('created_at', { ascending: false }),
        
        // New system (marketplace)
        supabase
          .from('marketplace_applications')
          .select('property_id, status')
          .eq('user_id', userId)
          .in('status', ['approved', 'housed'])
          .order('created_at', { ascending: false })
      ]);

      // Combine property IDs from both systems
      const propertyApps = propertyAppsResult.data || [];
      const marketplaceApps = marketplaceAppsResult.data || [];
      
      const allPropertyIds = [
        ...propertyApps.map(app => app.property_id),
        ...marketplaceApps.map(app => app.property_id)
      ].filter(Boolean);
      
      // Remove duplicates
      const uniquePropertyIds = [...new Set(allPropertyIds)];

      if (uniquePropertyIds.length > 0) {
        const { data: tenantProps, error: propsError } = await supabase
          .from('properties')
          .select('id, address, monthly_rent, status, lease_end_date, lease_start_date, rent_due_day')
          .in('id', uniquePropertyIds)
          .is('deleted_at', null)
          .order('lease_start_date', { ascending: false });
        
        if (!propsError && tenantProps) {
          setProperties(tenantProps);
        }
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleMaintenanceClick = () => {
    handleTabChange('Maintenance Request');
  };

  const handlePayRentClick = () => {
    setSearchParams({ tab: 'Rent Payments', subTab: 'payment' });
  };

  const { hasTenantRole } = useHasTenantMemberships();

  const menuItemsConfig = [
    { name: 'Dashboard', label: t('tenantDashboard.tabs.dashboard') },
    { name: 'My Matches', label: t('tenantDashboard.tabs.myMatches') },
    { name: 'Pay Rent', label: t('tenantDashboard.tabs.payRent') },
    { name: 'Maintenance Request', label: t('tenantDashboard.tabs.maintenanceRequest') },
    { name: 'Rent Payments', label: t('tenantDashboard.tabs.rentPayments') },
    { name: 'My Points', label: t('tenantDashboard.tabs.myPoints') },
    { name: 'Rent History', label: 'Rent History' },
    { name: 'Properties', label: t('tenantDashboard.tabs.properties') }
  ];

  const menuItems = hasTenantRole 
    ? menuItemsConfig.filter(item => ['Dashboard', 'My Matches', 'Pay Rent', 'Maintenance Request', 'Rent Payments', 'My Points', 'Rent History'].includes(item.name))
    : menuItemsConfig.filter(item => ['Dashboard', 'My Matches', 'Maintenance Request', 'Rent Payments', 'My Points', 'Rent History'].includes(item.name));

  const handlePayRentNavClick = () => {
    navigate('/pay-rent');
  };

  const [profileModalDismissed, setProfileModalDismissed] = useState(false);

  const showProfileModal = !profileCheckLoading && !isProfileComplete && userId && missingFields.length > 0 && !profileModalDismissed;

  return (
    <div className="min-h-screen bg-background">
      {showProfileModal && (
        <ProfileCompletionModal
          userId={userId}
          missingFields={missingFields}
          currentProfile={completionProfile}
          onComplete={async () => {
            await refetchProfileCompletion();
          }}
          onDismiss={() => setProfileModalDismissed(true)}
        />
      )}
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-colors cursor-pointer"
              >
                OpenKey
              </button>
              {hasActiveSubscription && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  Tenant Pro
                </div>
              )}
            </div>
            
            {/* Header Icons - Compact on mobile */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              <ThemeToggle />
              <Button 
                onClick={() => navigate('/messages?tab=notifications', {
                  state: { from: 'dashboard', dashboardTab: activeTab }
                })}
                variant="outline" 
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center min-w-[16px] sm:min-w-[20px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/messages', {
                  state: { from: 'dashboard', dashboardTab: activeTab }
                })}
                variant="outline" 
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white relative"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/tenant-profile', {
                  state: { from: 'dashboard', dashboardTab: activeTab }
                })}
                variant="outline" 
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <User className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="icon"
                className="h-8 w-8 sm:h-auto sm:w-auto sm:px-4 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Main Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-openkey-blue mb-1 sm:mb-2">Tenant Dashboard</h2>
            <p className="text-muted-foreground text-sm sm:text-lg">Welcome back, {tenantProfile?.full_name?.split(' ')[0] || user?.user_metadata?.first_name || 'Tenant'}</p>
          </div>
        </div>

        {/* Tenant Menu Bar - Horizontally scrollable on mobile */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-card rounded-lg border border-border p-1 overflow-x-auto">
            <nav className="flex min-w-max md:min-w-0">
              {menuItems.map((item, index) => (
                <button
                  key={item.name}
                  onClick={() => item.name === 'Pay Rent' ? handlePayRentNavClick() : handleTabChange(item.name)}
                  className={`flex-shrink-0 md:flex-1 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeTab === item.name
                      ? 'bg-openkey-blue text-white border border-openkey-blue'
                      : 'text-muted-foreground hover:text-openkey-blue hover:bg-openkey-blue/5'
                  } ${index > 0 ? 'ml-1' : ''} ${(item.name === 'My Points' || item.name === 'Properties' || item.name === 'Rent History') ? 'flex items-center justify-center space-x-1' : ''}`}
                >
                  {item.name === 'My Points' && <Award className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {item.name === 'Rent History' && <History className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {item.name === 'Properties' && <FileText className="w-3 h-3 sm:w-4 sm:h-4" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Dashboard' && (
          <>
            {/* Stats Cards Row - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-8">
              {/* Card 1: Lease Expiration - Premium with urgency */}
              <CardEnhanced variant="elevated" className="card-hover-gold group">
                <CardEnhancedHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Lease Expiration</CardEnhancedTitle>
                     <div className="p-3 bg-amber-500 rounded-xl shadow-sm">
                       <Clock className="w-5 h-5 text-white" />
                     </div>
                  </div>
                </CardEnhancedHeader>
                <CardEnhancedContent className="pt-0">
                  <div className="space-y-3">
                    {firstProperty?.lease_end_date ? (
                      <>
                        <div className="text-2xl font-bold text-openkey-blue">
                          {new Date(firstProperty.lease_end_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center justify-between">
                          {(() => {
                            const daysLeft = calculateDaysUntilDate(firstProperty.lease_end_date);
                            const isUrgent = daysLeft <= 30;
                            return (
                              <>
                                <Badge variant={isUrgent ? "warning" : "secondary"} className={`flex items-center gap-1 ${isUrgent ? 'animate-pulse' : ''}`}>
                                  <Clock className="w-3 h-3" />
                                  {daysLeft} days left
                                </Badge>
                                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isUrgent ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.max(10, Math.min(100, (365 - daysLeft) / 365 * 100))}%` }}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-lg font-semibold text-openkey-blue">Check Matches</span>
                        <p className="text-sm text-muted-foreground">Find your next home by checking matches</p>
                        <Button 
                          size="sm" 
                          onClick={() => handleTabChange('My Matches')}
                          className="w-full bg-openkey-blue hover:bg-openkey-blue-dark text-white"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Check Matches
                        </Button>
                      </div>
                    )}
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>

              {/* Card 2: Monthly Rent - Enhanced with breakdown preview */}
              <CardEnhanced variant="elevated" className="card-hover-gold group">
                <CardEnhancedHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardEnhancedTitle>
                     <div className="p-3 bg-emerald-500 rounded-xl shadow-sm">
                       <DollarSign className="w-5 h-5 text-white" />
                     </div>
                  </div>
                </CardEnhancedHeader>
                <CardEnhancedContent className="pt-0 space-y-3">
                  <MonthlyRentCard properties={properties} userId={userId} handleTabChange={handleTabChange} />
                </CardEnhancedContent>
              </CardEnhanced>

              {/* Card 3: Next Rent Payment - Uses usePaymentData for correct rent_due_day */}
              <DashboardNextPaymentCard 
                properties={properties} 
                userId={userId} 
                handleTabChange={handleTabChange}
                handlePayRentClick={handlePayRentClick}
              />

              {/* Card 4: Maintenance Requests - Success celebration */}
              <CardEnhanced 
                variant="elevated" 
                className="card-hover-gold cursor-pointer group"
                onClick={handleMaintenanceClick}
              >
                <CardEnhancedHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">Maintenance</CardEnhancedTitle>
                    <div className="p-3 bg-openkey-blue rounded-xl shadow-sm">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardEnhancedHeader>
                <CardEnhancedContent className="pt-0">
                  <div className="space-y-3">
                    {firstProperty ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-openkey-blue">{getActiveMaintenanceCount()}</span>
                          <span className="text-sm text-muted-foreground">active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {getActiveMaintenanceCount() === 0 ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              All resolved
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {getActiveMaintenanceCount()} pending
                            </Badge>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-openkey-blue hover:bg-openkey-blue/10">
                          + New
                        </Button>
                      </>
                     ) : (
                       <div className="space-y-3">
                         <span className="text-lg font-semibold text-openkey-blue">Check Matches</span>
                         <p className="text-sm text-muted-foreground">Apply first, then request maintenance</p>
                         <Button 
                           size="sm" 
                           onClick={() => handleTabChange('My Matches')}
                           className="w-full bg-openkey-blue hover:bg-openkey-blue-dark text-white"
                         >
                           <Search className="w-4 h-4 mr-2" />
                           Check Matches
                         </Button>
                       </div>
                     )}
                   </div>
                 </CardEnhancedContent>
               </CardEnhanced>
            </div>

            {/* Current Property Section */}
            <CardEnhanced variant="elevated" className="card-hover-gold mb-6">
              <CardEnhancedHeader>
                <CardEnhancedTitle className="text-xl font-bold text-openkey-blue flex items-center gap-2">
                  <div className="p-2 bg-openkey-blue/10 rounded-lg">
                    <Home className="w-5 h-5 text-openkey-blue" />
                  </div>
                  Your Current Property
                </CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent className="space-y-4">
                {properties.length > 0 ? (
                  <>
                    <div>
                      <p className="text-lg text-openkey-blue font-medium">
                        {properties[0].address}
                      </p>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <Button 
                        variant="outline" 
                        className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                        onClick={handleMaintenanceClick}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Maintenance Request
                      </Button>
                      
                      <Button 
                        variant="blue"
                        onClick={handlePayRentClick}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Rent
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 py-8">
                    <div className="p-4 bg-openkey-blue/5 rounded-xl">
                      <Home className="w-12 h-12 text-openkey-gold mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-openkey-blue mb-2">Welcome to Your Property Search!</h3>
                      <p className="text-muted-foreground mb-6">You haven't been assigned a property yet. Browse our available rentals and submit applications to get started.</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => handleTabChange('Market')}
                          variant="gradient"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Browse Market
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleTabChange('Properties')}
                          className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                        >
                          View My Applications
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardEnhancedContent>
            </CardEnhanced>

            {/* Referral Rewards, Rent Points & Lease Renewal Widgets */}
            {userId && (
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  <ReferralRewards userId={userId} />
                  <RentPointsAlert 
                    userId={userId} 
                    monthlyRent={firstProperty?.monthly_rent || 1200}
                  />
                  <LeaseRenewalMeter 
                    userId={userId}
                    leaseEndDate={properties[0]?.lease_end_date}
                    propertyId={properties[0]?.id}
                  />
                </div>
                
                {/* Basic lease renewal info only - detailed management in separate tab */}
              </div>
            )}
          </>
        )}


        {activeTab === 'My Matches' && userId && (
          <TenantMatchProposal onRequestProfileCompletion={() => setProfileModalDismissed(false)} />
        )}


        {activeTab === 'Maintenance Request' && userId && (
          <TenantMaintenanceDashboard userId={userId} />
        )}

        {activeTab === 'Rent Payments' && userId && (
          <RentPaymentsSubTabs
            userId={userId}
            properties={properties}
            overviewContent={
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-openkey-blue">Rent Payments & Autopay</h3>
                    <p className="text-muted-foreground mt-2">Manage your rent payments with ease and confidence</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <CardEnhanced variant="elevated" hover animate className="lg:col-span-2 card-hover-gold">
                    <CardEnhancedHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">
                          Payment Overview
                        </CardEnhancedTitle>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Next Payment Due Card */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-blue-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Next Payment Due</p>
                          </div>
                          <NextPaymentDueDisplay properties={properties} userId={userId} />
                        </div>

                        {/* Amount Due Card */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-emerald-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Amount Due</p>
                          </div>
                          <div className="text-2xl font-bold text-openkey-blue mb-2">
                            <AmountDueDisplay properties={properties} userId={userId} />
                          </div>
                          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                            Monthly Rent
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Autopay & Payment Methods Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Autopay Information */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-purple-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-1">Autopay Available</h4>
                              <p className="text-sm text-purple-700 dark:text-purple-400 leading-relaxed">
                                Set up autopay to never miss a payment and enjoy peace of mind. 
                                Manage your payment history, autopay settings, and payment methods all in one place.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-blue-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Payment Methods</h4>
                              <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                                Securely save your payment methods for quick and easy rent payments. 
                                Add or manage your cards and bank accounts in the Autopay section.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Tips & Support Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Payment Schedule */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-purple-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Payment Schedule</h4>
                              <PaymentScheduleDisplay properties={properties} userId={userId} />
                            </div>
                          </div>
                        </div>

                        {/* Need Help / Support */}
                        <div className="p-4 bg-card border border-border border-l-4 border-l-teal-500 rounded-lg shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-teal-800 dark:text-teal-300 mb-1">Need Help?</h4>
                              <p className="text-sm text-teal-700 dark:text-teal-400 leading-relaxed">
                                Questions about your payment? Contact support or visit our FAQ section 
                                for assistance with billing, autopay, or payment methods.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                  
                  <RentPointsRewardsCard 
                    userId={userId}
                    monthlyRent={properties[0]?.monthly_rent || 1200}
                  />
                </div>
              </div>
            }
          />
        )}

        {activeTab === 'My Points' && userId && (
          <PointsTab 
            userId={userId} 
            defaultSubtab={searchParams.get('subtab') === 'rewards' ? 'rewards' : 'overview'}
          />
        )}

        {activeTab === 'Rent History' && (
          <RentHistoryTab />
        )}


      </main>
    </div>
  );
};

export default TenantDashboardModern;
