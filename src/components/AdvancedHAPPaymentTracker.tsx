import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, Plus, Upload, Receipt, Link as LinkIcon, Zap } from 'lucide-react';

interface AdvancedHAPPaymentTrackerProps {
  propertyId: string;
  tenantId?: string;
  portfolioId?: string;
}

const AdvancedHAPPaymentTracker = ({ propertyId, tenantId, portfolioId }: AdvancedHAPPaymentTrackerProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [rentLedger, setRentLedger] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
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
    notes: '',
    receipt_file: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, [propertyId, tenantId]);

  const fetchData = async () => {
    await Promise.all([
      fetchPayments(),
      fetchRentLedger(),
      fetchConfig()
    ]);
    setLoading(false);
  };

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('hap_payments')
        .select(`
          *,
          hap_payee_configs!inner(payee_name, payee_type, auto_tracking_enabled),
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
    }
  };

  const fetchRentLedger = async () => {
    try {
      const { data, error } = await supabase
        .from('rent_ledger')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRentLedger(data || []);
    } catch (error) {
      console.error('Error fetching rent ledger:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('hap_payee_configs')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching HAP config:', error);
    }
  };

  const handleAddPayment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let receiptUrl = null;
      if (formData.receipt_file) {
        const fileName = `receipt_${Date.now()}.${formData.receipt_file.name.split('.').pop()}`;
        const filePath = `${user?.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, formData.receipt_file);

        if (uploadError) throw uploadError;
        receiptUrl = filePath;
      }

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
        receipt_url: receiptUrl,
        recorded_by: user?.id
      };

      const { data: newPayment, error } = await supabase
        .from('hap_payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;

      // Auto-post to rent ledger if payment is received
      if (formData.payment_status === 'received' && formData.actual_amount) {
        await postToRentLedger(newPayment);
      }

      toast({
        title: "Success",
        description: "HAP payment record added successfully"
      });

      setShowAddForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding HAP payment:', error);
      toast({
        title: "Error",
        description: "Failed to add HAP payment record",
        variant: "destructive"
      });
    }
  };

  const postToRentLedger = async (payment: any) => {
    try {
      const ledgerEntry = {
        property_id: propertyId,
        tenant_id: tenantId,
        amount: payment.actual_amount || payment.expected_amount,
        payment_date: payment.payment_date,
        payment_type: 'rent',
        payment_source: 'pha_hap',
        description: `HAP Payment - ${payment.pha_voucher_number || 'No voucher number'}`,
        reference_number: payment.pha_voucher_number,
        hap_payment_id: payment.id
      };

      const { data, error } = await supabase
        .from('rent_ledger')
        .insert(ledgerEntry)
        .select()
        .single();

      if (error) throw error;

      // Update payment with ledger entry reference
      await supabase
        .from('hap_payments')
        .update({ 
          rent_ledger_posted: true, 
          rent_ledger_entry_id: data.id 
        })
        .eq('id', payment.id);
        
    } catch (error) {
      console.error('Error posting to rent ledger:', error);
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

      const { data: updatedPayment, error } = await supabase
        .from('hap_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      // Post to rent ledger if marked as received and not already posted
      if (status === 'received' && !updatedPayment.rent_ledger_posted) {
        await postToRentLedger(updatedPayment);
      }

      toast({
        title: "Success",
        description: "Payment status updated"
      });

      fetchData();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const triggerPlaidSync = async () => {
    if (!config?.auto_tracking_enabled || !config?.plaid_account_id) {
      toast({
        title: "Plaid Not Connected",
        description: "Please enable and connect Plaid integration in payee configuration",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Syncing with Bank",
        description: "Checking for new HAP deposits via Plaid integration..."
      });

      const { data, error } = await supabase.functions.invoke('plaid-hap-sync', {
        body: {
          action: 'sync',
          propertyId: propertyId,
          configId: config.id
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: data.message || `Found ${data.synced || 0} new HAP payments`
      });

      if (data.synced > 0) {
        fetchData();
      }
    } catch (error) {
      console.error('Error syncing with Plaid:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with bank account",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
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
      notes: '',
      receipt_file: null
    });
  };

  const getStatusBadge = (status: string, isAutoTracked: boolean = false) => {
    const variants = {
      expected: { variant: 'outline', text: 'Expected', icon: Clock },
      received: { variant: 'default', text: 'Received', icon: CheckCircle },
      late: { variant: 'destructive', text: 'Late', icon: AlertTriangle },
      missing: { variant: 'destructive', text: 'Missing', icon: AlertTriangle }
    };

    const statusConfig = variants[status as keyof typeof variants] || variants.expected;
    const Icon = statusConfig.icon;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={statusConfig.variant as any} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {statusConfig.text}
        </Badge>
        {isAutoTracked && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Zap className="w-3 h-3" />
            Auto-tracked
          </Badge>
        )}
      </div>
    );
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthPayment = payments.find(payment => {
    const paymentDate = new Date(payment.payment_period_start);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });

  return (
    <div className="space-y-6">
      {/* Current Month Status & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              HAP Payment Dashboard
            </div>
            <div className="flex items-center gap-2">
              {config?.auto_tracking_enabled && (
                <Button 
                  onClick={triggerPlaidSync}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Sync with Bank
                </Button>
              )}
                <PermissionGuard 
                  object="portfolio.payments" 
                  action="create" 
                  scope="portfolio" 
                  portfolioId={portfolioId}
                >
                  <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add HAP Payment Record</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Period Start *</Label>
                        <Input
                          type="date"
                          value={formData.payment_period_start}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_period_start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Period End *</Label>
                        <Input
                          type="date"
                          value={formData.payment_period_end}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_period_end: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Expected Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.expected_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, expected_amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Actual Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.actual_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, actual_amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input
                          type="date"
                          value={formData.payment_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
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
                        <Label>PHA Voucher Number</Label>
                        <Input
                          value={formData.pha_voucher_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, pha_voucher_number: e.target.value }))}
                          placeholder="Voucher/reference number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Receipt Upload</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormData(prev => ({ ...prev, receipt_file: e.target.files?.[0] || null }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
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
                    </div>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
            </div>
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
              <div className="text-right space-y-2">
                {getStatusBadge(currentMonthPayment.payment_status, currentMonthPayment.matched_via_plaid)}
                {currentMonthPayment.payment_status === 'expected' && (
                  <div className="space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => updatePaymentStatus(currentMonthPayment.id, 'received', currentMonthPayment.expected_amount)}
                    >
                      Mark Received
                    </Button>
                  </div>
                )}
                {currentMonthPayment.rent_ledger_posted && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <LinkIcon className="w-3 h-3" />
                    Posted to Rent Ledger
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
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="space-y-1">
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
                    {payment.notes && (
                      <div className="text-xs text-muted-foreground max-w-md">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(payment.payment_status, payment.matched_via_plaid)}
                    {payment.payment_date && (
                      <div className="text-sm text-muted-foreground">
                        Received: {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      {payment.receipt_url && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          Receipt
                        </Badge>
                      )}
                      {payment.rent_ledger_posted && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Ledger
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Rent Ledger Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Rent Ledger Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {rentLedger.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No rent ledger entries yet
            </div>
          ) : (
            <div className="space-y-2">
              {rentLedger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">${entry.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{entry.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{new Date(entry.payment_date).toLocaleDateString()}</div>
                    <Badge variant="outline" className="text-xs">
                      {entry.payment_source === 'pha_hap' ? 'HAP' : 'Tenant'}
                    </Badge>
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

export default AdvancedHAPPaymentTracker;