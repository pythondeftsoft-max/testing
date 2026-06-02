import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, Plus, Upload } from 'lucide-react';

interface HAPPaymentTrackerProps {
  propertyId: string;
  tenantId?: string;
}

const HAPPaymentTracker = ({ propertyId, tenantId }: HAPPaymentTrackerProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    payment_period_start: '',
    payment_period_end: '',
    expected_amount: '',
    actual_amount: '',
    payment_date: '',
    payment_method: 'ach',
    payment_status: 'expected',
    verification_method: 'manual',
    pha_voucher_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [propertyId, tenantId]);

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('hap_payments')
        .select(`
          *,
          hap_payee_configs!inner(payee_name, payee_type),
          properties!inner(address)
        `)
        .eq('property_id', propertyId)
        .order('payment_period_start', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching HAP payments:', error);
      toast({
        title: "Error",
        description: "Failed to load HAP payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get HAP payee config for this property
      const { data: config } = await supabase
        .from('hap_payee_configs')
        .select('id')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .single();

      const paymentData = {
        property_id: propertyId,
        tenant_id: tenantId,
        hap_payee_config_id: config?.id,
        payment_period_start: formData.payment_period_start,
        payment_period_end: formData.payment_period_end,
        expected_amount: parseFloat(formData.expected_amount),
        actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : null,
        payment_date: formData.payment_date || null,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        verification_method: formData.verification_method,
        pha_voucher_number: formData.pha_voucher_number,
        notes: formData.notes,
        recorded_by: user?.id
      };

      const { error } = await supabase
        .from('hap_payments')
        .insert(paymentData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "HAP payment record added successfully"
      });

      setShowAddForm(false);
      setFormData({
        payment_period_start: '',
        payment_period_end: '',
        expected_amount: '',
        actual_amount: '',
        payment_date: '',
        payment_method: 'ach',
        payment_status: 'expected',
        verification_method: 'manual',
        pha_voucher_number: '',
        notes: ''
      });
      fetchPayments();
    } catch (error) {
      console.error('Error adding HAP payment:', error);
      toast({
        title: "Error",
        description: "Failed to add HAP payment record",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, actualAmount?: number) => {
    try {
      const updateData: any = {
        payment_status: status,
        payment_date: status === 'received' ? new Date().toISOString().split('T')[0] : null
      };

      if (actualAmount) {
        updateData.actual_amount = actualAmount;
      }

      const { error } = await supabase
        .from('hap_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment status updated"
      });

      fetchPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
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

  const getCurrentMonthExpected = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getFullYear() * 12 + currentDate.getMonth();
    
    return payments.find(payment => {
      const paymentDate = new Date(payment.payment_period_start);
      const paymentMonth = paymentDate.getFullYear() * 12 + paymentDate.getMonth();
      return paymentMonth === currentMonth;
    });
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

  const currentMonthPayment = getCurrentMonthExpected();

  return (
    <div className="space-y-6">
      {/* Current Month Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Current Month HAP Status
            </div>
            <Button 
              onClick={() => setShowAddForm(true)} 
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentMonthPayment ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Expected: ${currentMonthPayment.expected_amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Period: {new Date(currentMonthPayment.payment_period_start).toLocaleDateString()} - 
                  {new Date(currentMonthPayment.payment_period_end).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(currentMonthPayment.payment_status)}
                {currentMonthPayment.payment_status === 'expected' && (
                  <div className="mt-2 space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => updatePaymentStatus(currentMonthPayment.id, 'received', currentMonthPayment.expected_amount)}
                    >
                      Mark Received
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No HAP payment expected for current month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add HAP Payment Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Payment Period Start *</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={formData.payment_period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">Payment Period End *</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={formData.payment_period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_period_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected-amount">Expected Amount *</Label>
                <Input
                  id="expected-amount"
                  type="number"
                  step="0.01"
                  value={formData.expected_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual-amount">Actual Amount</Label>
                <Input
                  id="actual-amount"
                  type="number"
                  step="0.01"
                  value={formData.actual_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-status">Status</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expected">Expected</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voucher-number">PHA Voucher Number</Label>
                <Input
                  id="voucher-number"
                  value={formData.pha_voucher_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, pha_voucher_number: e.target.value }))}
                  placeholder="Voucher/reference number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this payment"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddPayment}
                disabled={!formData.payment_period_start || !formData.payment_period_end || !formData.expected_amount}
              >
                Add Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            HAP Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No HAP payments recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      ${payment.expected_amount.toFixed(2)}
                      {payment.actual_amount && payment.actual_amount !== payment.expected_amount && (
                        <span className="text-sm text-muted-foreground ml-2">
                          (Received: ${payment.actual_amount.toFixed(2)})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.payment_period_start).toLocaleDateString()} - 
                      {new Date(payment.payment_period_end).toLocaleDateString()}
                    </div>
                    {payment.pha_voucher_number && (
                      <div className="text-xs text-muted-foreground">
                        Voucher: {payment.pha_voucher_number}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(payment.payment_status)}
                    {payment.payment_date && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Received: {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
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

export default HAPPaymentTracker;