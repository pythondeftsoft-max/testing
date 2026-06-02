import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, CreditCard, DollarSign, Home, Receipt, Settings, Zap, Download, CheckCircle, ArrowLeft, Loader2, Bell, MessageSquare, User, LogOut, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useSubscription } from "@/hooks/useSubscription";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from "@/components/StripePaymentForm";
import { AutopaySetupModal } from "@/components/AutopaySetupModal";
import { AutopayStatusCard } from "@/components/AutopayStatusCard";
import { PaymentMethodsManager } from "@/components/PaymentMethodsManager";
import { PaymentFeeBreakdown } from "@/components/PaymentFeeBreakdown";
import { useAutopay, type AutopaySchedule } from "@/hooks/useAutopay";
import { usePaymentData } from "@/hooks/usePaymentData";
import { generatePaymentHistoryPDF } from "@/utils/paymentPdfUtils";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function RentPaymentsNew() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAutopayModal, setShowAutopayModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string>("");
  const [currentTenantId, setCurrentTenantId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AutopaySchedule | null>(null);
  const { toast } = useToast();
  const { autopaySchedules, toggleAutopayStatus, deleteAutopaySchedule, refreshData: refreshAutopayData } = useAutopay();
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { hasActiveSubscription } = useSubscription(user?.id, 'tenant');
  
  // Use the payment data hook for the currently selected property
  const { paymentHistory, balance, property: currentProperty, rentSplits, isLoading: paymentDataLoading, error: paymentDataError, refetch } = usePaymentData(currentPropertyId, currentTenantId);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Set demo values for non-authenticated users
        setUser({ id: 'demo-tenant-id', email: 'demo@example.com' });
        setCurrentPropertyId('demo-property-id');
        setCurrentTenantId('demo-tenant-id');
        setProperties([{
          id: 'demo-property-id',
          address: 'Demo Property Address',
          monthly_rent: 1200,
          status: 'occupied'
        }]);
        setLoading(false);
        return;
      }

      setUser(user);
      setCurrentTenantId(user.id);

      // PRIORITY 1: Fetch properties where user has APPROVED applications (tenant properties)
      const { data: applications, error: appError } = await supabase
        .from('property_applications')
        .select('property_id, status')
        .eq('tenant_id', user.id)
        .eq('status', 'approved');

      console.log('Approved applications found:', applications);

      let tenantPropertyList: any[] = [];
      if (applications && applications.length > 0 && !appError) {
        const propertyIds = applications.map(app => app.property_id);
        const { data: tenantProps, error: tenantPropsError } = await supabase
          .from('properties')
          .select('id, address, monthly_rent, status, owner_id')
          .in('id', propertyIds);
        
        if (!tenantPropsError && tenantProps) {
          tenantPropertyList = tenantProps.map(prop => ({
            ...prop,
            user_role: 'tenant' // Mark as tenant property
          }));
          console.log('Tenant properties with approved applications:', tenantPropertyList);
        }
      }

      // PRIORITY 2: Fetch properties where user is the owner (for landlords)
      const { data: ownedProperties, error: ownedError } = await supabase
        .from('properties')
        .select('id, address, monthly_rent, status, owner_id')
        .eq('owner_id', user.id);

      let ownedPropertyList: any[] = [];
      if (!ownedError && ownedProperties) {
        ownedPropertyList = ownedProperties.map(prop => ({
          ...prop,
          user_role: 'owner' // Mark as owned property
        }));
        console.log('Owned properties:', ownedPropertyList);
      }
      
      // Combine properties, prioritizing tenant properties with approved applications
      const allProperties = [...tenantPropertyList, ...ownedPropertyList];
      
      // Remove duplicates (in case user is both tenant and owner of same property)
      const uniqueProperties = allProperties.reduce((acc, current) => {
        const existing = acc.find(item => item.id === current.id);
        if (!existing) {
          acc.push(current);
        } else {
          // If duplicate, prioritize tenant role (since that means approved application)
          if (current.user_role === 'tenant' && existing.user_role === 'owner') {
            const index = acc.findIndex(item => item.id === current.id);
            acc[index] = { ...current, user_role: 'tenant' };
          }
        }
        return acc;
      }, [] as any[]);

      console.log('Final property list:', uniqueProperties);
      setProperties(uniqueProperties);

      // Auto-select first property, prioritizing tenant properties
      if (uniqueProperties.length > 0) {
        // Prioritize properties where user is tenant (has approved application)
        const tenantProperty = uniqueProperties.find(p => p.user_role === 'tenant');
        const selectedProperty = tenantProperty || uniqueProperties[0];
        
        setCurrentPropertyId(selectedProperty.id);
        setSelectedPropertyId(selectedProperty.id);
        console.log(`Auto-selected property: ${selectedProperty.address} (${selectedProperty.id}) - Role: ${selectedProperty.user_role}`);
      } else {
        // Fallback to demo mode if no properties found
        console.log('No properties found, using demo mode');
        setCurrentPropertyId('demo-property-id');
        setSelectedPropertyId('demo-property-id');
        setProperties([{
          id: 'demo-property-id',
          address: 'Demo Property Address',
          monthly_rent: 1200,
          status: 'occupied',
          user_role: 'demo'
        }]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load rent payment data",
        variant: "destructive",
      });
      // Set demo values on error
      setCurrentPropertyId('demo-property-id');
      setCurrentTenantId('demo-tenant-id');
      setProperties([{
        id: 'demo-property-id',
        address: 'Demo Property Address',
        monthly_rent: 1200,
        status: 'occupied'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const fetchPayments = () => {
    refetch();
  };

  const handleDownloadPDF = () => {
    if (!paymentHistory.length) {
      toast({
        title: "No Payment History",
        description: "There are no payments to export.",
        variant: "destructive"
      });
      return;
    }

    const paymentsData = paymentHistory.map(payment => ({
      id: payment.id || 'N/A',
      date: new Date(payment.payment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      amount: payment.amount,
      status: payment.status,
      method: payment.payment_method || 'Online',
      paymentStatus: payment.payment_status as 'on_time' | 'late',
      daysLate: payment.days_late || 0,
      referenceNumber: payment.reference_number || 'N/A',
      lateFeeAmount: payment.late_fee_amount || 0
    }));

    const summary = {
      totalPayments: paymentHistory.length,
      totalAmount: paymentHistory.reduce((sum, p) => sum + p.amount, 0),
      onTimePayments: paymentHistory.filter(p => p.payment_status === 'on_time').length,
      latePayments: paymentHistory.filter(p => p.payment_status === 'late').length,
      totalLateFees: paymentHistory.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0)
    };

    const propertyDetails = {
      address: currentProperty?.address || 'Demo Property Address',
      monthlyRent: currentProperty?.monthly_rent || 1200,
      lateFeeAmount: currentProperty?.late_fee_amount || 25,
      graceDays: currentProperty?.late_fee_grace_days || 5,
      rentDueDay: currentProperty?.rent_due_day || 1
    };

    generatePaymentHistoryPDF(paymentsData, summary, user?.email || 'Current Tenant', propertyDetails);
  };

  const getPaymentStatusBadge = (paymentStatus: string, daysLate?: number) => {
    if (paymentStatus === 'on_time') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-1 py-0">
          On Time
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs px-1 py-0">
          Late ({daysLate || 0}d)
        </Badge>
      );
    }
  };

  const handleSetupAutopay = (property: any) => {
    setSelectedProperty(property);
    setShowAutopayModal(true);
  };

  const getPropertyAutopaySchedule = (propertyId: string) => {
    return autopaySchedules.find(schedule => schedule.property_id === propertyId);
  };

  const createPaymentIntent = async (propertyId: string, amount: number) => {
    try {
      setIsCreatingPayment(true);
      
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      
      if (!jwt) {
        throw new Error('Authentication required. Please log in to make a payment.');
      }
      
      const { data, error } = await supabase.functions.invoke('create-rent-payment', {
        body: {
          propertyId,
          amount: amount // Pass the amount to the backend
        },
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.client_secret) {
        throw new Error('Failed to create payment intent');
      }

      setClientSecret(data.client_secret);
      return data.client_secret;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handlePayNowClick = async () => {
    try {
      // Validate property selection
      if (!currentPropertyId || !properties.find(p => p.id === currentPropertyId)) {
        toast({
          title: "Property Selection Required",
          description: "Please select a valid property to make a payment.",
          variant: "destructive"
        });
        return;
      }

      // Ensure properties have finished loading
      if (loading || (currentPropertyId !== 'demo-property-id' && paymentDataLoading)) {
        toast({
          title: "Loading",
          description: "Please wait for properties to finish loading.",
          variant: "default"
        });
        return;
      }

      // Validate user has approved application for this property (for tenant payments)
      const currentProp = properties.find(p => p.id === currentPropertyId);
      if (currentProp?.user_role === 'tenant') {
        // Double-check approved application exists
        const { data: appCheck } = await supabase
          .from('property_applications')
          .select('status')
          .eq('tenant_id', user.id)
          .eq('property_id', currentPropertyId)
          .eq('status', 'approved')
          .maybeSingle();
        
        if (!appCheck) {
          toast({
            title: "Payment Not Allowed",
            description: "You don't have an approved application for this property. Please contact the landlord.",
            variant: "destructive"
          });
          return;
        }
      }

      console.log(`Initiating payment for property: ${currentPropertyId}, tenant portion: ${tenantPortion}, total with fee: ${paymentAmount}`);
      
      await createPaymentIntent(currentPropertyId, paymentAmount);
      setSelectedPropertyId(currentPropertyId);
      setShowPaymentForm(true);
    } catch (error) {
      // Error already handled in createPaymentIntent
    }
  };

  if (loading || (currentPropertyId && currentPropertyId !== 'demo-property-id' && paymentDataLoading)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-3 text-muted-foreground">Loading payment information...</p>
        </div>
      </div>
    );
  }

  // Calculate tenant portion based on rent splits or full rent
  const getTenantPaymentAmount = () => {
    // Use rent splits if available, otherwise fall back to full rent amount
    const fullRentAmount = balance?.balance_remaining > 0 ? balance.balance_remaining : balance?.total_due || (currentProperty?.monthly_rent || 1200);
    
    if (rentSplits) {
      // Use tenant portion from rent splits
      return rentSplits.tenant_portion;
    }
    
    // Fall back to full rent amount if no splits configured
    return fullRentAmount;
  };

  const tenantPortion = getTenantPaymentAmount();
  const baseAmount = tenantPortion;
  const paymentAmount = Math.round(baseAmount * 1.01); // Include 1% tenant fee on tenant portion only

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Back to Dashboard and Logo */}
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/dashboard?tab=Rent Payments')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-primary">
                  OpenKey
                </div>
                {hasActiveSubscription && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    Tenant Pro
                  </div>
                )}
              </div>
            </div>
            
            {/* Header Icons */}
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => navigate('/messages?tab=notifications')}
                variant="outline" 
                size="icon"
                className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/messages')}
                variant="outline" 
                size="icon"
                className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg relative"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/tenant-profile')}
                variant="outline" 
                size="icon"
                className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200 rounded-lg"
              >
                <User className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Rent Payments</h1>
          <p className="text-muted-foreground">
            Manage your rent payments, autopay, and view payment history
          </p>
        </div>

        {/* Account Balance Section */}
        {balance && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Account Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    {rentSplits ? "Your Portion Due" : "Total Due"}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${rentSplits ? tenantPortion.toFixed(2) : balance.total_due.toFixed(2)}
                  </p>
                  {rentSplits && (
                    <p className="text-xs text-blue-600 mt-1">
                      HAP pays ${rentSplits.pha_portion.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Balance Remaining</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${rentSplits ? Math.max(0, tenantPortion - (balance.total_paid || 0)).toFixed(2) : balance.balance_remaining.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Late Fees</p>
                  <p className="text-2xl font-bold text-red-900">${balance.total_late_fees.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="payment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="autopay">Autopay</TabsTrigger>
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-6">
            {/* Property Selection */}
            {properties.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="w-5 h-5" />
                    <span>Select Property</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={currentPropertyId}
                    onValueChange={(value) => {
                      setCurrentPropertyId(value);
                      setSelectedPropertyId(value);
                      console.log(`Property changed to: ${value}`);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address} - ${property.monthly_rent?.toFixed(2)}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Payment Amount Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Make a Payment</span>
                </CardTitle>
                <CardDescription>
                  Pay your rent securely online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    {/* Payment Due Date Section */}
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200">
                      <span className="text-sm font-medium">Payment Due:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {balance?.current_due_date 
                            ? new Date(balance.current_due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric', 
                                year: 'numeric'
                              })
                            : 'First of next month'}
                        </span>
                        {/* Status Badge */}
                        {(() => {
                          const dueDate = balance?.current_due_date 
                            ? new Date(balance.current_due_date) 
                            : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
                          const today = new Date();
                          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                          
                          if (daysDiff < 0) {
                            return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
                          } else if (daysDiff === 0) {
                            return <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">Due Today</Badge>;
                          } else if (daysDiff <= 3) {
                            return <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">Due Soon</Badge>;
                          } else if (daysDiff <= 7) {
                            return <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">Due This Week</Badge>;
                          } else {
                            return <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Upcoming</Badge>;
                          }
                        })()}
                      </div>
                    </div>
                    {/* Show rent breakdown if HAP splits are configured */}
                    {rentSplits ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Total Rent:</span>
                          <span className="text-sm font-medium">${rentSplits.total_rent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">HAP Portion (paid by housing authority):</span>
                          <span className="text-sm text-gray-600">${rentSplits.pha_portion.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-600">Your Tenant Portion:</span>
                          <span className="text-sm font-medium text-blue-600">${baseAmount.toFixed(2)}</span>
                        </div>
                        <Separator className="my-2" />
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Rent Amount:</span>
                        <span className="text-sm">${baseAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Processing Fee (1%):</span>
                      <span className="text-sm">${(paymentAmount - baseAmount).toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-medium">Total Amount:</span>
                      <span className="font-medium">${paymentAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
{/* PaymentFeeBreakdown component removed due to interface mismatch */}
                
                <Button 
                  onClick={handlePayNowClick}
                  className="w-full"
                  size="lg"
                  disabled={isCreatingPayment || !currentPropertyId}
                >
                  {isCreatingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay ${paymentAmount.toFixed(2)}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5" />
                  <span>Payment History</span>
                </CardTitle>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                {paymentDataLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="ml-3 text-muted-foreground">Loading payment history...</p>
                  </div>
                ) : paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              ${payment.amount.toFixed(2)} - {payment.payment_method || 'Online'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.payment_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getPaymentStatusBadge(payment.payment_status, payment.days_late)}
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {paymentHistory.length > 5 && (
                      <div className="text-center py-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/payments/history')}>
                          View All ({paymentHistory.length} payments)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No payment history found</p>
                    <p className="text-sm text-gray-400">Your payments will appear here after you make your first payment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="w-5 h-5" />
                  <span>Your Properties</span>
                </CardTitle>
                <CardDescription>
                  Properties you can make payments for
                </CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length > 0 ? (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div
                        key={property.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          currentPropertyId === property.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setCurrentPropertyId(property.id);
                          setSelectedPropertyId(property.id);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{property.address}</h3>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${property.monthly_rent?.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">per month</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Home className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No properties found</p>
                    <p className="text-sm text-gray-400">You don't have any properties to make payments for</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="autopay" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Autopay Settings</span>
                </CardTitle>
                <CardDescription>
                  Set up automatic rent payments to never miss a due date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length > 0 ? (
                  <div className="space-y-4">
                    {properties.map((property) => {
                      const schedule = getPropertyAutopaySchedule(property.id);
                      return (
                        <div className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{property.address}</h3>
                              <p className="text-sm text-gray-500">${property.monthly_rent?.toFixed(2)}/month</p>
                            </div>
                            <Button onClick={() => handleSetupAutopay(property)} variant="outline" size="sm">
                              {schedule ? 'Edit Autopay' : 'Setup Autopay'}
                            </Button>
                          </div>
                          {schedule && (
                            <div className="mt-2 text-sm text-green-600">
                              Autopay enabled - Next payment: {schedule.next_payment_date}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No properties for autopay</p>
                    <p className="text-sm text-gray-400">You need at least one property to set up autopay</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-methods" className="space-y-6">
            <PaymentMethodsManager />
          </TabsContent>
        </Tabs>

        {/* Stripe Payment Form Modal */}
        {showPaymentForm && clientSecret && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <Elements 
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#3b82f6',
                    }
                  }
                }}
              >
                <StripePaymentForm
                  propertyId={selectedPropertyId}
                  amount={paymentAmount}
                  clientSecret={clientSecret}
                  onSuccess={() => {
                    setShowPaymentForm(false);
                    setClientSecret("");
                    fetchPayments();
                    refreshAutopayData();
                  }}
                  onCancel={() => {
                    setShowPaymentForm(false);
                    setClientSecret("");
                  }}
                />
              </Elements>
            </div>
          </div>
        )}

        {/* Autopay Setup Modal */}
        {showAutopayModal && selectedProperty && (
          <AutopaySetupModal
            propertyId={selectedProperty.id}
            propertyAddress={selectedProperty.address}
            monthlyRent={selectedProperty.monthly_rent}
            existingSchedule={editingSchedule}
            isOpen={showAutopayModal}
            onClose={() => {
              setShowAutopayModal(false);
              setSelectedProperty(null);
              setEditingSchedule(null);
            }}
            onSuccess={() => {
              setShowAutopayModal(false);
              setSelectedProperty(null);
              setEditingSchedule(null);
              refreshAutopayData();
            }}
          />
        )}
      </div>
    </div>
  );
}