import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Calendar, DollarSign, CreditCard, Home, Filter, Search, FileText, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateReceiptPDF } from '@/utils/receiptGenerator';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency-display';

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
  };
}

export const PaymentHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, monthFilter]);

  const fetchPaymentHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('asset_payment_transactions')
        .select(`
          *,
          portfolio_assets (
            asset_name,
            asset_value
          )
        `)
        .eq('payer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        toast({
          title: "Error",
          description: "Failed to load payment history",
          variant: "destructive",
        });
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
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
        payment.stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Month filter
    if (monthFilter !== 'all') {
      const filterDate = new Date();
      if (monthFilter === 'current') {
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.payment_date);
          return paymentDate.getMonth() === filterDate.getMonth() && 
                 paymentDate.getFullYear() === filterDate.getFullYear();
        });
      } else if (monthFilter === 'last') {
        filterDate.setMonth(filterDate.getMonth() - 1);
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.payment_date);
          return paymentDate.getMonth() === filterDate.getMonth() && 
                 paymentDate.getFullYear() === filterDate.getFullYear();
        });
      }
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
      ['Date', 'Property', 'Amount', 'Status', 'Payment ID'].join(','),
      ...filteredPayments.map(payment => [
        new Date(payment.payment_date).toLocaleDateString(),
        payment.portfolio_assets?.asset_name || 'Unknown',
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
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export Complete",
      description: "Payment history exported successfully",
    });
  };

  const handleViewReceipt = (payment: PaymentTransaction) => {
    setSelectedPayment(payment);
    setShowReceiptDialog(true);
  };

  const handleDownloadReceipt = async (payment: PaymentTransaction) => {
    try {
      const receiptData = {
        transactionId: payment.stripe_payment_intent_id || payment.id,
        propertyName: payment.portfolio_assets?.asset_name || 'Property Payment',
        amount: payment.amount,
        currency: payment.currency_code || 'USD',
        date: payment.payment_date,
        paymentMethod: 'Card',
        status: payment.status
      };

      await generateReceiptPDF(receiptData);
      
      toast({
        title: "Receipt Downloaded",
        description: "Payment receipt has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    }
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
              <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
              <p className="text-muted-foreground">View your payment transaction history</p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by property or payment ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="current">This Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
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
                    {searchTerm || statusFilter !== 'all' || monthFilter !== 'all' 
                      ? "No payments match your current filters"
                      : "You haven't made any payments yet"}
                  </p>
                  {searchTerm || statusFilter !== 'all' || monthFilter !== 'all' ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setMonthFilter('all');
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={() => navigate('/pay-rent')}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Make Payment
                    </Button>
                  )}
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {getStatusBadge(payment.status)}
                        {payment.status === 'succeeded' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReceipt(payment)}
                              className="text-xs"
                            >
                              View Receipt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReceipt(payment)}
                              className="text-xs"
                            >
                              Download PDF
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
                Summary
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
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipt Dialog */}
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Receipt
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <div className="font-mono">{selectedPayment.stripe_payment_intent_id || selectedPayment.id}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Property:</span>
                      <div className="font-medium">{selectedPayment.portfolio_assets?.asset_name || 'Property Payment'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">
                        <CurrencyDisplay 
                          amount={selectedPayment.amount}
                          currency={selectedPayment.currency_code as any}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <div className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div>{getStatusBadge(selectedPayment.status)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Method:</span>
                      <div className="font-medium">Card</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReceipt(selectedPayment)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => setShowReceiptDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};