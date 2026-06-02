import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Building2, DollarSign, Calendar, TrendingUp, AlertTriangle, CreditCard, FileDown, RefreshCw, CheckCircle, Clock, XCircle, Settings, Zap, BarChart3, Plus } from 'lucide-react';
import { usePaymentAnalytics } from '@/hooks/usePaymentAnalytics';
import { PlaidLink } from '@/components/PlaidLink';
import EnhancedHAPPayeeConfig from '@/components/EnhancedHAPPayeeConfig';
import AdvancedHAPPaymentTracker from '@/components/AdvancedHAPPaymentTracker';
import { PropertyPaymentDetailsModal } from '@/components/PropertyPaymentDetailsModal';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';

const PaymentAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  const [hapPayments, setHapPayments] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<string>('everything');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          // Don't fetch properties here - wait for portfolio selection
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/auth');
      }
    };
    
    getUser();
  }, [navigate]);

  // Portfolio Isolation Priority: Analytics hook with proper portfolio state
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = usePaymentAnalytics(user?.id || '', currentPortfolio);

  // Debug logging for Portfolio Isolation Priority
  console.log('📊 PaymentAnalytics render (Portfolio Isolation Priority):', {
    currentPortfolio,
    portfolioMode: currentPortfolio === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
    analyticsData: analyticsData ? {
      totalProperties: analyticsData.totalProperties,
      totalReceived: analyticsData.totalReceived,
      totalExpected: analyticsData.totalExpected,
      overallCollectionRate: analyticsData.overallCollectionRate
    } : null,
    analyticsLoading,
    localPropertiesCount: properties.length,
    timestamp: new Date().toISOString()
  });

  const fetchProperties = async (landlordId: string) => {
    console.log('🏠 fetchProperties called (Portfolio Isolation Priority):', {
      landlordId,
      currentPortfolio,
      portfolioMode: currentPortfolio === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
      timestamp: new Date().toISOString()
    });
    
    // Portfolio Isolation Priority: Validate portfolio before fetching
    if (!currentPortfolio) {
      console.log('❌ No portfolio selected - Portfolio Isolation Priority prevents fetching');
      return;
    }
    
    try {
      // Build query with Portfolio Isolation Priority
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          has_voucher,
          status,
          rent_splits(pha_portion, tenant_portion, voucher_type)
        `)
        .eq('owner_id', landlordId)
        .neq('status', 'deleted')
        .order('address');

      // Portfolio Isolation Priority: Fix "everything" view to only include assigned portfolios
      if (currentPortfolio === 'everything') {
        console.log('🌍 EVERYTHING VIEW: Fetching only properties assigned to created portfolios');
        // FIXED: Only include properties that are assigned to portfolios (exclude unassigned)
        query = query.not('portfolio_id', 'is', null);
      } else {
        console.log('🏢 PORTFOLIO ISOLATED: Filtering by portfolio:', currentPortfolio);
        query = query.eq('portfolio_id', currentPortfolio);
      }

      const { data: properties, error } = await query;

      if (error) throw error;
      
      console.log('✅ Properties fetched (Portfolio Isolation Priority):', {
        count: properties?.length || 0,
        portfolioId: currentPortfolio,
        portfolioMode: currentPortfolio === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
        properties: properties?.map(p => ({ id: p.id, address: p.address }))
      });
      
      setProperties(properties || []);

      // Fetch payment data for these properties (preserving existing logic)
      const propertyIds = properties?.map(p => p.id) || [];
      if (propertyIds.length > 0) {
        await Promise.all([
          fetchRentPayments(propertyIds),
          fetchHAPPayments(propertyIds)
        ]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to load property data",
        variant: "destructive"
      });
    }
  };

  const fetchRentPayments = async (propertyIds: string[]) => {
    try {
      const { data: payments, error } = await supabase
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIds)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setRentPayments(payments || []);
    } catch (error) {
      console.error('Error fetching rent payments:', error);
    }
  };

  const fetchHAPPayments = async (propertyIds: string[]) => {
    try {
      const { data: payments, error } = await supabase
        .from('hap_payments')
        .select('*')
        .in('property_id', propertyIds)
        .order('payment_period_start', { ascending: false });

      if (error) throw error;
      setHapPayments(payments || []);
    } catch (error) {
      console.error('Error fetching HAP payments:', error);
    }
  };

  const getPaymentStatus = (propertyId: string, property: any) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Check if property has HAP (voucher) - improved logic
    const hasHAP = property.has_voucher || 
                   (property.rent_splits && property.rent_splits.length > 0 && 
                    property.rent_splits[0].pha_portion > 0);
    
    // Get HAP payments for current month
    const hapPayment = hapPayments.find(payment => 
      payment.property_id === propertyId && 
      payment.payment_period_start?.startsWith(currentMonth)
    );
    
    // Get tenant payments for current month  
    const tenantPayment = rentPayments.find(payment => 
      payment.property_id === propertyId && 
      payment.due_date?.startsWith(currentMonth)
    );
    
    // Determine HAP status - simplified to "paid" or "expected"
    let hapStatus = 'none';
    let hapVariant = 'neutral';
    let hapDate = null;
    let hapExpectedDate = null;
    
    if (hasHAP) {
      if (hapPayment && hapPayment.payment_status === 'received' && hapPayment.is_verified) {
        hapStatus = 'paid';
        hapVariant = 'success';
        hapDate = hapPayment.payment_date;
      } else {
        // HAP expected - default expected date to 1st of month
        hapStatus = 'expected';
        hapVariant = 'warning';
        hapExpectedDate = `${currentMonth}-01`;
      }
    }
    
    // Determine tenant status
    let tenantStatus = 'pending';
    let tenantVariant = 'warning';
    let tenantDate = null;
    let daysLate = 0;
    
    if (tenantPayment) {
      daysLate = tenantPayment.days_late || 0;
      tenantDate = tenantPayment.payment_date;
      
      if (tenantPayment.status === 'completed') {
        if (daysLate === 0) {
          tenantStatus = 'paid';
          tenantVariant = 'success';
        } else {
          tenantStatus = 'late';
          tenantVariant = 'warning';
        }
      } else if (tenantPayment.status === 'pending') {
        const today = new Date();
        const dueDate = new Date(tenantPayment.due_date);
        const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysPastDue > 0) {
          tenantStatus = 'overdue';
          tenantVariant = 'danger';
          daysLate = daysPastDue;
        }
      }
    } else {
      // No tenant payment record found - check if overdue
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysPastMonth = Math.floor((today.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysPastMonth > 5) { // Consider overdue after 5 days into the month
        tenantStatus = 'overdue';
        tenantVariant = 'danger';
        daysLate = daysPastMonth - 1; // Approximate days late
      }
    }
    
    return {
      hasHAP,
      hap: { status: hapStatus, variant: hapVariant, date: hapDate, expectedDate: hapExpectedDate },
      tenant: { status: tenantStatus, variant: tenantVariant, date: tenantDate, daysLate }
    };
  };

  const handleRefresh = () => {
    if (user?.id && currentPortfolio) {
      fetchProperties(user.id);
      refetchAnalytics();
    }
  };

  const handlePortfolioChange = (portfolioId: string) => {
    console.log('🔄 handlePortfolioChange called (Portfolio Isolation Priority):', {
      newPortfolioId: portfolioId,
      currentPortfolio,
      newMode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
      timestamp: new Date().toISOString()
    });
    
    // Immediately clear all local state to prevent cross-portfolio contamination
    setProperties([]);
    setRentPayments([]);
    setHapPayments([]);
    setSelectedProperty(null);
    setIsModalOpen(false);
    
    // Update portfolio state with Portfolio Isolation Priority
    setCurrentPortfolio(portfolioId);
    
    // Fetch new data after state update
    if (user?.id) {
      setTimeout(() => {
        console.log('🔄 Fetching data after portfolio change (Portfolio Isolation Priority):', {
          portfolioId,
          userId: user.id,
          mode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
          timestamp: new Date().toISOString()
        });
        fetchProperties(user.id);
      }, 0);
    }
  };

  useEffect(() => {
    if (user?.id && currentPortfolio) {
      console.log('📋 Portfolio change detected - fetching properties (Portfolio Isolation Priority):', {
        userId: user.id,
        currentPortfolio,
        mode: currentPortfolio === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED'
      });
      fetchProperties(user.id);
    }
  }, [currentPortfolio, user?.id]);

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payment analytics...</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentPortfolio === 'everything' ? 'Everything View' : 'Portfolio Isolated'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Analytics</h1>
                <p className="text-gray-600">
                  {currentPortfolio === 'everything' 
                    ? 'Everything View - Only assigned portfolio properties' 
                    : 'Portfolio Isolated - Client-specific data'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <PortfolioSelectorDropdown
                selectedPortfolio={currentPortfolio}
                onPortfolioChange={handlePortfolioChange}
                userId={user?.id}
              />
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={analyticsLoading}
                className="bg-white border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analyticsData || analyticsData.totalProperties === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {currentPortfolio === 'everything' 
                  ? 'No Payment Data Found in Assigned Portfolios' 
                  : 'No Payment Data Found for This Portfolio'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {currentPortfolio === 'everything'
                  ? 'You don\'t have any properties with payment data in your created portfolios yet.'
                  : 'This portfolio doesn\'t have any properties with payment data yet.'
                }
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Manage Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs key={`${user?.id}-${currentPortfolio}`} defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Payment Overview
              </TabsTrigger>
              <TabsTrigger value="hap-setup" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                HAP Setup
              </TabsTrigger>
              <TabsTrigger value="plaid-bank" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Bank Connection
              </TabsTrigger>
              <TabsTrigger value="payment-tracking" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Summary Cards - preserving all existing calculation logic */}
              {(() => {
                console.log('🎯 Rendering summary cards with data (Portfolio Isolation Priority):', {
                  totalProperties: analyticsData?.totalProperties,
                  propertiesWithVouchers: analyticsData?.propertiesWithVouchers,
                  currentMonthReceived: analyticsData?.currentMonthReceived,
                  currentMonthExpected: analyticsData?.currentMonthExpected,
                  totalReceived: analyticsData?.totalReceived,
                  overallCollectionRate: analyticsData?.overallCollectionRate,
                  totalLatePayments: analyticsData?.totalLatePayments,
                  totalMissedPayments: analyticsData?.totalMissedPayments,
                  currentPortfolio,
                  portfolioMode: currentPortfolio === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
                  timestamp: new Date().toISOString()
                });
                return null;
              })()}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Properties</p>
                        <p className="text-2xl font-bold">{analyticsData.totalProperties}</p>
                        <p className="text-xs text-muted-foreground">
                          {analyticsData.propertiesWithVouchers} with vouchers
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">This Month Total</p>
                        <p className="text-2xl font-bold">${analyticsData.currentMonthReceived.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">
                          of ${analyticsData.currentMonthExpected.toFixed(0)} expected
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Received</p>
                        <p className="text-2xl font-bold">${analyticsData.totalReceived.toFixed(0)}</p>
                        <Badge 
                          variant={analyticsData.overallCollectionRate > 90 ? 'default' : 'outline'}
                          className="text-xs mt-1"
                        >
                          {analyticsData.overallCollectionRate.toFixed(1)}% rate
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Issues</p>
                        <p className="text-2xl font-bold">{analyticsData.totalLatePayments + analyticsData.totalMissedPayments}</p>
                        <p className="text-xs text-muted-foreground">
                          {analyticsData.totalLatePayments} late, {analyticsData.totalMissedPayments} missed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Breakdown */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Payment Source Breakdown</CardTitle>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">Overall Collection Performance:</div>
                        <div className="flex items-center space-x-3">
                          <Progress 
                            value={analyticsData.overallCollectionRate} 
                            className={`w-24 h-2 ${
                              analyticsData.overallCollectionRate > 90 ? '[&>div]:bg-green-500' :
                              analyticsData.overallCollectionRate > 70 ? '[&>div]:bg-yellow-500' : 
                              '[&>div]:bg-red-500'
                            }`}
                          />
                          <span className="font-semibold text-primary text-sm">{analyticsData.overallCollectionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${analyticsData.totalReceived.toFixed(0)} collected of ${analyticsData.totalExpected.toFixed(0)} expected
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* HAP Payments */}
                      <div className="p-6 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            <h3 className="text-lg font-semibold">HAP Payments</h3>
                            <Badge variant="outline">Section 8</Badge>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{analyticsData.propertiesWithVouchers} with vouchers</p>
                            <p>of {analyticsData.totalProperties} properties</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Vouchers</span>
                            <span className="font-medium">{analyticsData.propertiesWithVouchers} / {analyticsData.totalProperties}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Expected / Total Received</span>
                            <span className="font-medium">${analyticsData.hapTotalExpected.toFixed(0)} / ${analyticsData.hapTotalReceived.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tenant Payments */}
                      <div className="p-6 border rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <CreditCard className="w-6 h-6 text-green-600" />
                          <h3 className="text-lg font-semibold">Tenant Payments</h3>
                          <Badge variant="outline">Direct</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Tenants</span>
                            <span className="font-medium">{analyticsData.propertiesWithVouchers} / {analyticsData.totalProperties}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Number of Tenants portion paid</span>
                            <span className="font-medium">{analyticsData.propertiesWithVouchers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Revenue Received / Total Revenue Expected</span>
                            <span className="font-medium">${analyticsData.tenantTotalReceived.toFixed(0)} / ${analyticsData.tenantTotalExpected.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Late Payments</span>
                            <span className="font-medium">{analyticsData.totalLatePayments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Properties Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Payment Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {properties.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading property payment data...</p>
                    </div>
                  ) : properties.filter(property => property.status === 'occupied').length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Occupied Properties</h3>
                      <p className="text-muted-foreground">
                        {currentPortfolio === 'everything' 
                          ? 'No occupied properties found across all portfolios.'
                          : 'No occupied properties found in this portfolio.'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {properties.filter(property => property.status === 'occupied').map((property) => {
                      const paymentStatus = getPaymentStatus(property.id, property);
                      
                      // Helper function to format date display
                      const formatDateDisplay = (date: string | null) => {
                        if (!date) return null;
                        return new Date(date).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      };
                      
                      const handlePropertyClick = () => {
                        setSelectedProperty(property);
                        setIsModalOpen(true);
                      };

                      return (
                        <div 
                          key={property.id} 
                          className="relative p-8 border rounded-lg bg-white hover:shadow-md transition-shadow min-h-[180px] cursor-pointer"
                          onClick={handlePropertyClick}
                        >
                          {/* Left Side - Property Info and Payment Details */}
                          <div className="pr-32">
                            <h4 className="font-semibold text-lg leading-tight mb-4">{property.address}</h4>
                            
                            {/* Payment Information */}
                            <div className="mb-6 space-y-2 text-sm">
                              <p className="font-medium">Monthly Rent: <span className="text-foreground">${property.monthly_rent?.toFixed(2)}</span></p>
                              <div className="flex gap-4">
                                <p className="text-muted-foreground">HAP: <span className="text-foreground">${property.rent_splits?.[0]?.pha_portion?.toFixed(2) || '0.00'}</span></p>
                                <p className="text-muted-foreground">Tenant: <span className="text-foreground">${property.rent_splits?.[0]?.tenant_portion?.toFixed(2) || property.monthly_rent?.toFixed(2) || '0.00'}</span></p>
                              </div>
                            </div>
                            
                            {/* Payment Dates */}
                            <div className="space-y-3">
                              {paymentStatus.hasHAP && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">HAP: </span>
                                  <span className="text-foreground font-medium">
                                    {paymentStatus.hap.status === 'paid' && paymentStatus.hap.date
                                      ? formatDateDisplay(paymentStatus.hap.date)
                                      : paymentStatus.hap.expectedDate
                                      ? `Expected ${formatDateDisplay(paymentStatus.hap.expectedDate)}`
                                      : 'Expected'
                                    }
                                  </span>
                                </div>
                              )}
                              
                              <div className="text-sm">
                                <span className="text-muted-foreground">Tenant: </span>
                                <span className="text-foreground font-medium">
                                  {paymentStatus.tenant.date
                                    ? formatDateDisplay(paymentStatus.tenant.date)
                                    : paymentStatus.tenant.status === 'overdue' 
                                    ? `Overdue ${paymentStatus.tenant.daysLate}d`
                                    : 'Pending'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Side - Status Badges */}
                          <div className="absolute top-8 right-8 flex flex-col items-end gap-3">
                            {/* Occupied Badge */}
                            <Badge variant="occupied" className="px-3 py-1.5 text-xs font-medium min-w-[80px] text-center">
                              Occupied
                            </Badge>
                            
                            {/* HAP Payment Status - Only show if property has HAP */}
                            {paymentStatus.hasHAP && (
                              <Badge 
                                variant={paymentStatus.hap.variant as any} 
                                className="px-3 py-1.5 text-xs font-medium min-w-[80px] text-center"
                              >
                                {paymentStatus.hap.status === 'paid' ? 'HAP Paid' : 'HAP Expected'}
                              </Badge>
                            )}

                            {/* Tenant Payment Status */}
                            <Badge 
                              variant={paymentStatus.tenant.variant as any} 
                              className="px-3 py-1.5 text-xs font-medium min-w-[80px] text-center"
                            >
                              {paymentStatus.tenant.status === 'paid' ? 'Tenant Paid' :
                               paymentStatus.tenant.status === 'late' ? `Tenant Late (${paymentStatus.tenant.daysLate}d)` :
                               paymentStatus.tenant.status === 'overdue' ? `Tenant Overdue (${paymentStatus.tenant.daysLate}d)` :
                               'Tenant Pending'}
                            </Badge>
                          </div>
                        </div>
                      );
                     })}
                     </div>
                   )}
                 </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hap-setup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    HAP Payee Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Set up HAP (Housing Assistance Payment) configuration for your voucher properties
                  </p>
                </CardHeader>
                <CardContent>
                  {properties.filter(p => p.has_voucher).length > 0 ? (
                    <div className="space-y-6">
                      {properties.filter(p => p.has_voucher).map(property => (
                        <div key={property.id} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{property.address}</h3>
                            <Badge variant="outline">Section 8</Badge>
                          </div>
                          <EnhancedHAPPayeeConfig 
                            propertyId={property.id}
                            onConfigUpdated={() => handleRefresh()}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Voucher Properties Found</h3>
                      <p className="text-muted-foreground mb-4">
                        You need properties with housing vouchers to set up HAP payments.
                      </p>
                      <Button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Voucher Property
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plaid-bank" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Bank Account Connection
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Connect your bank account via Plaid to automatically track HAP deposits
                  </p>
                </CardHeader>
                <CardContent>
                  {properties.filter(p => p.has_voucher).length > 0 ? (
                    <div className="space-y-6">
                      {properties.filter(p => p.has_voucher).map(property => (
                        <div key={property.id} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{property.address}</h3>
                            <Badge variant="outline">Plaid Integration</Badge>
                          </div>
                          <PlaidLink
                            configId={property.id}
                            onSuccess={() => {
                              toast({
                                title: "Success",
                                description: "Bank account connected successfully!"
                              });
                              handleRefresh();
                            }}
                            onExit={() => {
                              console.log("Plaid connection cancelled");
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Voucher Properties Found</h3>
                      <p className="text-muted-foreground mb-4">
                        You need properties with housing vouchers to connect bank accounts.
                      </p>
                      <Button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Voucher Property
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-tracking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    HAP Payment Tracking
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Track and manage HAP payments with automatic bank sync and manual entry
                  </p>
                </CardHeader>
                <CardContent>
                  {properties.filter(p => p.has_voucher).length > 0 ? (
                    <div className="space-y-6">
                      {properties.filter(p => p.has_voucher).map(property => (
                        <div key={property.id} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{property.address}</h3>
                            <Badge variant="outline">Payment History</Badge>
                          </div>
                          <AdvancedHAPPaymentTracker propertyId={property.id} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Voucher Properties Found</h3>
                      <p className="text-muted-foreground mb-4">
                        You need properties with housing vouchers to track HAP payments.
                      </p>
                      <Button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Voucher Property
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Property Details Modal */}
        <PropertyPaymentDetailsModal
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
};

export default PaymentAnalytics;
