
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CreditCard, Calendar, DollarSign, CheckCircle, Download } from 'lucide-react';
import { usePaymentData } from '@/hooks/usePaymentData';
import { generatePaymentHistoryPDF } from '@/utils/paymentPdfUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/StripePaymentForm';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const RentPayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [user, setUser] = useState<any>(null);
  const [propertyId, setPropertyId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  
  // Get current user and set up proper IDs
  React.useEffect(() => {
    const getUser = async () => {
      try {
        // Add a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );
        
        const authPromise = supabase.auth.getUser();
        
        const { data: { user } } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (user) {
          setUser(user);
          setTenantId(user.id);
          
          // Find a property this tenant has an approved application for
          try {
            const { data: applications } = await supabase
              .from('property_applications')
              .select('property_id, properties(id, address)')
              .eq('tenant_id', user.id)
              .eq('status', 'approved')
              .limit(1);
            
            if (applications && applications.length > 0) {
              setPropertyId(applications[0].property_id);
              console.log('Found approved application for property:', applications[0].property_id);
            } else {
              // No approved applications, try any property as fallback
              const { data: properties } = await supabase
                .from('properties')
                .select('id')
                .limit(1);
              
              if (properties && properties.length > 0) {
                setPropertyId(properties[0].id);
              } else {
                setPropertyId('demo-property-id');
              }
            }
          } catch (propertyError) {
            console.error('Error fetching properties:', propertyError);
            setPropertyId('demo-property-id');
          }
        } else {
          // No user found, set demo values to allow page to load
          console.log('No authenticated user found, using demo mode');
          setPropertyId('demo-property-id');
          setTenantId('demo-tenant-id');
          setUser({ id: 'demo-tenant-id', email: 'demo@example.com' } as any);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // On error, set demo values to prevent infinite loading
        setPropertyId('demo-property-id');
        setTenantId('demo-tenant-id');
        setUser({ id: 'demo-tenant-id', email: 'demo@example.com' } as any);
      }
    };
    
    getUser();
  }, []);
  
  const { paymentHistory, balance, property, isLoading, error, refetch } = usePaymentData(propertyId, tenantId);

  // Listen for successful payments and refresh data
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payment_completed') {
        refetch();
        localStorage.removeItem('payment_completed');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  const handlePayment = () => {
    if (!propertyId || propertyId === 'demo-property-id') {
      toast({
        title: "Demo Mode",
        description: "This is a demo. In production, this would process a real payment.",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method before proceeding.",
        variant: "destructive"
      });
      return;
    }

    // Navigate to dedicated payment page
    navigate('/payment', {
      state: {
        amount: paymentAmount,
        propertyId: propertyId
      }
    });
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
      address: property?.address || 'Demo Property Address',
      monthlyRent: property?.monthly_rent || 1200,
      lateFeeAmount: property?.late_fee_amount || 25,
      graceDays: property?.late_fee_grace_days || 5,
      rentDueDay: property?.rent_due_day || 1
    };

    generatePaymentHistoryPDF(paymentsData, summary, user?.email || 'Current Tenant', propertyDetails);
  };

  const getPaymentStatusBadge = (paymentStatus: string, daysLate?: number) => {
    if (paymentStatus === 'on_time') {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs px-1 py-0">
          On Time
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs px-1 py-0">
          Late ({daysLate || 0}d)
        </Badge>
      );
    }
  };

  // Show loading state while getting user data or payment data
  if (!user || (user && !propertyId) || (propertyId && propertyId !== 'demo-property-id' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openkey-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {!user ? 'Loading user information...' : 'Loading payment information...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Payment data error:', error);
    // Don't show error screen, just log it and continue with demo data
  }

  const paymentAmount = balance?.balance_remaining > 0 ? balance.balance_remaining : balance?.total_due || 1200;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-accent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gradient-blue-gold">Rent Payments</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your rent payments and view payment history</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Outstanding Balance Section */}
        {balance && (
          <CardEnhanced variant="premium" className="mb-8">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center space-x-2 text-gradient-blue-gold">
                <DollarSign className="w-6 h-6 text-openkey-gold" />
                <span>Account Balance Overview</span>
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-subtle-blue rounded-xl border border-openkey-blue/20">
                  <DollarSign className="w-8 h-8 text-openkey-blue mx-auto mb-3" />
                  <p className="text-sm font-medium text-openkey-blue">Total Due</p>
                  <p className="text-3xl font-bold text-openkey-blue">${balance.total_due.toFixed(2)}</p>
                </div>
                <div className="text-center p-6 bg-gradient-subtle-gold rounded-xl border border-openkey-gold/20">
                  <CheckCircle className="w-8 h-8 text-openkey-gold mx-auto mb-3" />
                  <p className="text-sm font-medium text-openkey-gold">Balance Remaining</p>
                  <p className="text-3xl font-bold text-openkey-gold">${balance.balance_remaining.toFixed(2)}</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-red-50/50 to-red-100/50 rounded-xl border border-red-200/50">
                  <Calendar className="w-8 h-8 text-red-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-red-600">Late Fees</p>
                  <p className="text-3xl font-bold text-red-700">${balance.total_late_fees.toFixed(2)}</p>
                </div>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="h-fit">
            <CardEnhanced variant="premium" hover animate className="min-h-[500px] flex flex-col">
              <CardEnhancedHeader className="pb-4">
                <CardEnhancedTitle className="flex items-center space-x-2 text-gradient-blue-gold">
                  <CreditCard className="w-6 h-6 text-openkey-blue" />
                  <span>Make a Payment</span>
                </CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent className="flex-1 flex flex-col space-y-6">
                <div className="bg-gradient-subtle-blue border border-openkey-blue/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-openkey-blue">Next Payment Due</span>
                    <Badge variant="outline" className="bg-openkey-blue/10 text-openkey-blue border-openkey-blue/30">
                      {balance?.current_due_date ? new Date(balance.current_due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Jan 1, 2025'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-openkey-blue/80">Base Rent:</span>
                      <span className="text-openkey-blue font-semibold">${property?.monthly_rent || 1200}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-openkey-blue/80">Processing Fee (1%):</span>
                      <span className="text-openkey-blue font-semibold">${((property?.monthly_rent || 1200) * 0.01).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-openkey-blue/20 pt-3 flex justify-between">
                      <span className="text-sm font-medium text-openkey-blue">Total Amount:</span>
                      <span className="text-2xl font-bold text-openkey-blue">${((property?.monthly_rent || 1200) * 1.01).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-foreground font-medium">Payment Amount</Label>
                  <Input
                    id="amount"
                    type="text"
                    value={`$${paymentAmount.toFixed(2)}`}
                    readOnly
                    className="mt-2 bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment amount is set by your landlord and cannot be modified.
                  </p>
                </div>

                <div>
                  <Label htmlFor="payment-method" className="text-foreground font-medium">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="debit-card">Debit Card</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="ach">ACH Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1" />
                
                <Button 
                  onClick={handlePayment}
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={!paymentMethod}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay Now
                </Button>
              </CardEnhancedContent>
            </CardEnhanced>
          </div>

          {/* Payment History */}
          <div className="h-fit">
            <CardEnhanced variant="premium" hover animate className="min-h-[500px] flex flex-col">
              <CardEnhancedHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardEnhancedTitle className="flex items-center space-x-2 text-gradient-blue-gold">
                    <Calendar className="w-6 h-6 text-openkey-gold" />
                    <span>Payment History</span>
                  </CardEnhancedTitle>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                </div>
              </CardEnhancedHeader>
              <CardEnhancedContent className="flex-1 overflow-hidden">
                {paymentHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-openkey-gold/50" />
                      <p className="font-medium text-lg">No payment history available</p>
                      <p className="text-sm mt-2">
                        Payments will appear here after completion.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto space-y-3 pr-2">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-xl border border-border hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground">
                              {new Date(payment.payment_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{payment.payment_method || 'Online Payment'}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2 flex-shrink-0 ml-3">
                          <p className="font-bold text-foreground text-lg">${payment.amount.toFixed(2)}</p>
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs px-2 py-1">
                              {payment.status}
                            </Badge>
                            {getPaymentStatusBadge(payment.payment_status, payment.days_late)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardEnhancedContent>
            </CardEnhanced>
          </div>
        </div>


      </main>
    </div>
  );
};

export default RentPayments;
