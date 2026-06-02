import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp, Plus, CreditCard } from 'lucide-react';
import { PlaidLink } from './PlaidLink';

interface UnitPaymentTrackerProps {
  propertyId: string;
  unitId: string;
  unitNumber: string;
  showBankConnection?: boolean;
  onRefresh?: () => void;
}

const UnitPaymentTracker = ({ propertyId, unitId, unitNumber, showBankConnection = false, onRefresh }: UnitPaymentTrackerProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hapConfig, setHapConfig] = useState<any>(null);
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalExpected: 0,
    onTimePayments: 0,
    latePayments: 0
  });

  useEffect(() => {
    fetchPayments();
    if (showBankConnection) {
      fetchHAPConfig();
    }
  }, [unitId, showBankConnection]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('hap_payments')
        .select(`
          *,
          hap_payee_configs!inner(payee_name, payee_type)
        `)
        .eq('unit_id', unitId)
        .order('payment_period_start', { ascending: false })
        .limit(6);

      if (error) throw error;

      setPayments(data || []);
      
      // Calculate stats
      const totalReceived = data?.reduce((sum, p) => sum + (p.actual_amount || 0), 0) || 0;
      const totalExpected = data?.reduce((sum, p) => sum + p.expected_amount, 0) || 0;
      const onTimePayments = data?.filter(p => p.payment_status === 'received' && p.payment_date).length || 0;
      const latePayments = data?.filter(p => p.payment_status === 'late').length || 0;
      
      setStats({
        totalReceived,
        totalExpected,
        onTimePayments,
        latePayments
      });
    } catch (error) {
      console.error('Error fetching unit payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHAPConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('hap_payee_configs')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setHapConfig(data);
    } catch (error) {
      console.error('Error fetching HAP config:', error);
    }
  };

  const handleBankConnectionSuccess = () => {
    fetchHAPConfig();
    fetchPayments();
    onRefresh?.();
    toast({
      title: "Success",
      description: "Bank connection updated successfully",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      expected: { variant: 'outline', text: 'Expected', icon: Clock },
      received: { variant: 'default', text: 'Received', icon: CheckCircle },
      late: { variant: 'destructive', text: 'Late', icon: AlertTriangle },
      missing: { variant: 'destructive', text: 'Missing', icon: AlertTriangle }
    };

    const statusConfig = variants[status as keyof typeof variants] || variants.expected;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {statusConfig.text}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Connection Section */}
      {showBankConnection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Bank Connection - Unit {unitNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hapConfig ? (
              <PlaidLink
                configId={hapConfig.id}
                onSuccess={handleBankConnectionSuccess}
                isConnected={hapConfig.auto_tracking_enabled && !!hapConfig.plaid_institution_name}
                institutionName={hapConfig.plaid_institution_name}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">HAP Configuration Required</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Please set up HAP configuration for this unit before connecting a bank account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unit Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Unit {unitNumber} Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Total Received</span>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(stats.totalReceived)}
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Expected</span>
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(stats.totalExpected)}
              </p>
            </div>
            
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">On Time</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {stats.onTimePayments}
              </p>
            </div>
            
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Late</span>
              </div>
              <p className="text-xl font-bold text-red-700 dark:text-red-300">
                {stats.latePayments}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Payments</span>
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payment records found for this unit.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {formatDate(payment.payment_period_start)} - {formatDate(payment.payment_period_end)}
                      </span>
                      {getStatusBadge(payment.payment_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expected: {formatCurrency(payment.expected_amount)}
                      {payment.actual_amount && ` | Received: ${formatCurrency(payment.actual_amount)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-lg">
                      {formatCurrency(payment.actual_amount || payment.expected_amount)}
                    </p>
                    {payment.payment_date && (
                      <p className="text-sm text-muted-foreground">
                        Paid: {formatDate(payment.payment_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitPaymentTracker;