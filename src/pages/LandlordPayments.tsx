import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Calendar, DollarSign, CreditCard, Home, Filter, Search, Users, Eye, FileDown, Landmark, FileText, Building2, FileSignature } from 'lucide-react';
import { LandlordPaymentsAnalytics } from '@/components/LandlordPaymentsAnalytics';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import LandlordHAPHistory from '@/components/landlord/LandlordHAPHistory';
import Landlord1099Summary from '@/components/landlord/Landlord1099Summary';
import LandlordW9Manager from '@/components/landlord/LandlordW9Manager';
import LandlordVacancyListings from '@/components/landlord/LandlordVacancyListings';
import LandlordHAPStatements from '@/components/landlord/LandlordHAPStatements';
import SpecialClaimSubmit from '@/components/landlord/SpecialClaimSubmit';
import HelpTrigger from '@/components/help/HelpTrigger';

interface PaymentTransaction {
  id: string;
  asset_id: string;
  payer_user_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency_code: string;
  status: string;
  payment_date: string;
  created_at: string;
  portfolio_assets?: {
    asset_name: string;
    asset_value: number;
    portfolio_id: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const LandlordPayments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);

  const portfolioId = searchParams.get('portfolioId');

  useEffect(() => {
    fetchPaymentData();
  }, [portfolioId]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, propertyFilter, dateRange]);

  const fetchPaymentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      let query = supabase
        .from('asset_payment_transactions')
        .select(`
          *,
          portfolio_assets (
            asset_name,
            asset_value,
            portfolio_id
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by portfolio if specified
      if (portfolioId) {
        // First get assets for this portfolio
        const { data: assets, error: assetsError } = await supabase
          .from('portfolio_assets')
          .select('id')
          .eq('portfolio_id', portfolioId);

        if (assetsError) {
          console.error('Error fetching assets:', assetsError);
          return;
        }

        const assetIds = assets?.map(a => a.id) || [];
        query = query.in('asset_id', assetIds);
      } else {
        // Get all payments for user's portfolios
        const { data: userPortfolios, error: portfolioError } = await supabase
          .from('portfolio_roles')
          .select('portfolio_id')
          .eq('user_id', user.id)
          .in('role_name', ['admin_partner', 'editor']);

        if (portfolioError) {
          console.error('Error fetching user portfolios:', portfolioError);
          return;
        }

        const portfolioIds = userPortfolios?.map(p => p.portfolio_id) || [];
        
        if (portfolioIds.length > 0) {
          const { data: assets, error: assetsError } = await supabase
            .from('portfolio_assets')
            .select('id')
            .in('portfolio_id', portfolioIds);

          if (assetsError) {
            console.error('Error fetching assets:', assetsError);
            return;
          }

          const assetIds = assets?.map(a => a.id) || [];
          query = query.in('asset_id', assetIds);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payment data:', error);
        toast({
          title: "Error",
          description: "Failed to load payment data",
          variant: "destructive",
        });
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.portfolio_assets?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(payment => payment.asset_id === propertyFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      filtered = filtered.filter(payment => 
        new Date(payment.payment_date) >= cutoffDate
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Property', 'Tenant', 'Amount', 'Status', 'Payment ID'].join(','),
      ...filteredPayments.map(payment => [
        new Date(payment.payment_date).toLocaleDateString(),
        payment.portfolio_assets?.asset_name || 'Unknown',
        `${payment.profiles?.first_name || 'Unknown'} ${payment.profiles?.last_name || 'Tenant'}`.trim(),
        `$${payment.amount.toFixed(2)}`,
        payment.status,
        payment.stripe_payment_intent_id || payment.id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `landlord-payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export Complete",
      description: "Payment data exported successfully",
    });
  };

  const viewReceipt = (paymentId: string) => {
    // Open receipt in new tab/window
    window.open(`/receipts/${paymentId}`, '_blank');
  };

  const downloadReceipt = (paymentId: string) => {
    // Trigger PDF download
    const link = document.createElement('a');
    link.href = `/api/receipts/${paymentId}/pdf`;
    link.download = `receipt-${paymentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Receipt PDF download has begun",
    });
  };

  const getUniqueProperties = () => {
    const properties = payments.reduce((acc, payment) => {
      if (payment.portfolio_assets && !acc.find(p => p.id === payment.asset_id)) {
        acc.push({
          id: payment.asset_id,
          name: payment.portfolio_assets.asset_name
        });
      }
      return acc;
    }, [] as Array<{id: string; name: string}>);
    return properties;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Management</h1>
              <p className="text-muted-foreground">Monitor all tenant payments across your portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HelpTrigger />
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tenant_payments" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto h-auto flex-wrap">
            <TabsTrigger value="tenant_payments"><CreditCard className="w-3.5 h-3.5 mr-1" /> Tenant Payments</TabsTrigger>
            <TabsTrigger value="hap_payments"><Landmark className="w-3.5 h-3.5 mr-1" /> HAP Payments</TabsTrigger>
            <TabsTrigger value="statements"><FileText className="w-3.5 h-3.5 mr-1" /> Statements</TabsTrigger>
            <TabsTrigger value="1099_summary"><FileText className="w-3.5 h-3.5 mr-1" /> 1099 Summary</TabsTrigger>
            <TabsTrigger value="w9_forms"><FileText className="w-3.5 h-3.5 mr-1" /> W-9 Forms</TabsTrigger>
            <TabsTrigger value="vacancies"><Building2 className="w-3.5 h-3.5 mr-1" /> My Vacancies</TabsTrigger>
            <TabsTrigger value="special_claims"><FileSignature className="w-3.5 h-3.5 mr-1" /> Special Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="tenant_payments">

        {/* Analytics */}
        <LandlordPaymentsAnalytics payments={payments} />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by property or tenant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="succeeded">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {getUniqueProperties().map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || propertyFilter !== 'all' || dateRange !== 'all'
                      ? "No payments match your current filters"
                      : "No tenant payments have been processed yet"}
                  </p>
                  {searchTerm || statusFilter !== 'all' || propertyFilter !== 'all' || dateRange !== 'all' ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setPropertyFilter('all');
                        setDateRange('all');
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Home className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {payment.portfolio_assets?.asset_name || 'Property Payment'}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Payment from tenant
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                          {payment.stripe_payment_intent_id && (
                            <div className="text-xs text-muted-foreground font-mono">
                              ID: {payment.stripe_payment_intent_id.slice(-8)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-right">
                        <CurrencyDisplay 
                          amount={payment.amount} 
                          currency={payment.currency_code?.toUpperCase() as any}
                          variant="large"
                          className="text-foreground"
                        />
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        {getStatusBadge(payment.status)}
                        {payment.status === 'succeeded' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewReceipt(payment.id)}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReceipt(payment.id)}
                              className="text-xs"
                            >
                              <FileDown className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredPayments.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {filteredPayments.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">
                    {filteredPayments.filter(p => p.status === 'succeeded').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">
                    {filteredPayments.filter(p => p.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <CurrencyDisplay
                    amount={filteredPayments
                      .filter(p => p.status === 'succeeded')
                      .reduce((sum, p) => sum + p.amount, 0)
                    }
                    variant="large"
                    className="text-foreground"
                  />
                  <div className="text-sm text-muted-foreground">Total Collected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="hap_payments">
            {userId && <LandlordHAPHistory landlordId={userId} portfolioId={portfolioId || undefined} />}
          </TabsContent>

          <TabsContent value="statements">
            {userId && <LandlordHAPStatements landlordId={userId} />}
          </TabsContent>

          <TabsContent value="1099_summary">
            {userId && <Landlord1099Summary landlordId={userId} portfolioId={portfolioId || undefined} />}
          </TabsContent>

          <TabsContent value="w9_forms">
            {userId && <LandlordW9Manager landlordId={userId} />}
          </TabsContent>

          <TabsContent value="vacancies">
            {userId && <LandlordVacancyListings landlordId={userId} />}
          </TabsContent>

          <TabsContent value="special_claims">
            {userId && <SpecialClaimSubmit landlordId={userId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};