import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Calendar, Receipt, DollarSign, FileText, Download, Search, ChevronDown, ChevronUp, Edit, Trash2, X } from 'lucide-react';
import { useVendorPayments, type VendorPaymentRecord } from '@/hooks/useVendorPayments';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { PaymentMethodSelect } from '@/components/PaymentMethodSelect';
import { ManualPaymentMethodModal, type ManualPaymentMethod } from '@/components/ManualPaymentMethodModal';
import { formatCurrency } from '@/utils/maintenanceUtils';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PAYMENT_METHOD_LABELS, getPaymentMethodLabel, type PayoutMethod } from '@/utils/paymentMethods';
import { supabase } from '@/integrations/supabase/client';

interface VendorPaymentHistoryProps {
  userId?: string;
  portfolioId?: string;
}

const VendorPaymentHistory = ({ userId, portfolioId }: VendorPaymentHistoryProps) => {
  const { getPaymentHistory, updatePayment, deletePayment, loading } = useVendorPayments();
  const { accounts } = useBankAccounts();
  const [payments, setPayments] = useState<VendorPaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<VendorPaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingPayment, setEditingPayment] = useState<VendorPaymentRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<VendorPaymentRecord>>({});
  const [properties, setProperties] = useState<any[]>([]);
  const [manualPaymentMethods, setManualPaymentMethods] = useState<ManualPaymentMethod[]>([]);
  const [showManualPaymentMethod, setShowManualPaymentMethod] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadPayments();
      fetchProperties();
    }
  }, [isExpanded, portfolioId]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, paymentMethodFilter]);

  const loadPayments = async () => {
    const paymentData = await getPaymentHistory(portfolioId);
    setPayments(paymentData as VendorPaymentRecord[]);
  };

  const fetchProperties = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      let query = supabase
        .from('properties')
        .select('id, address, portfolio_id')
        .eq('owner_id', user.user.id)
        .order('address');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.memo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === paymentMethodFilter);
    }

    setFilteredPayments(filtered);
  };

  const getTotalAmount = () => {
    return filteredPayments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getPaymentMethods = () => {
    const methods = [...new Set(payments.map(p => p.payment_method))];
    return methods.filter(Boolean);
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants = {
      'bank_transfer': 'default',
      'check': 'secondary',
      'cash': 'outline',
      'credit_card': 'destructive',
      'ach': 'default',
      'digital_check': 'default'
    } as const;
    
    return variants[method as keyof typeof variants] || 'outline';
  };

  const getPaymentMethodDisplay = (method: string) => {
    // If it's a UUID (36 characters with dashes), try to lookup bank account
    if (method.length === 36 && method.includes('-')) {
      const bankAccount = accounts.find(account => account.id === method);
      if (bankAccount) {
        const displayName = bankAccount.account_name || bankAccount.institution_name || 'Bank Account';
        const mask = bankAccount.mask ? ` ••••${bankAccount.mask}` : '';
        return `${displayName}${mask}`;
      }
      return 'Bank Account';
    }
    
    // Try to get label from payment methods utility
    try {
      return getPaymentMethodLabel(method as PayoutMethod);
    } catch {
      // Fallback to formatted string
      return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleEditPayment = (payment: VendorPaymentRecord) => {
    setEditingPayment(payment);
    setEditFormData({
      property_id: payment.property_id,
      recipient_type: payment.recipient_type,
      recipient_name: payment.recipient_name,
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference: payment.reference || '',
      memo: payment.memo || '',
      paid_at: format(new Date(payment.paid_at), "yyyy-MM-dd'T'HH:mm")
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPayment || !editFormData) return;

    try {
      await updatePayment(editingPayment.id!, editFormData);
      setEditingPayment(null);
      setEditFormData({});
      loadPayments(); // Refresh the list
    } catch (error) {
      console.error('Failed to update payment:', error);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId);
      loadPayments(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
  };

  const handleAddNewPaymentMethod = () => {
    setShowManualPaymentMethod(true);
  };

  const handleSaveManualPaymentMethod = (paymentMethod: ManualPaymentMethod) => {
    setManualPaymentMethods(prev => [...prev, paymentMethod]);
    setEditFormData({...editFormData, payment_method: paymentMethod.id});
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost" 
          className="w-full justify-between p-4 h-auto border border-border rounded-lg hover:bg-muted/50 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold text-foreground">Payment History</div>
              <div className="text-sm text-muted-foreground">
                View and manage vendor payment records
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        <CardEnhanced variant="elevated" hover={false}>
          <CardEnhancedHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <CardEnhancedTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Payment Records
              </CardEnhancedTitle>
              
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors, reference, memo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {getPaymentMethods().map((method) => (
                      <SelectItem key={method} value={method}>
                        {getPaymentMethodDisplay(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardEnhancedHeader>

          <CardEnhancedContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payment records found</h3>
                <p className="text-muted-foreground">
                  {payments.length === 0 
                    ? "No payments have been recorded yet." 
                    : "No payments match your current filters."
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(getTotalAmount())}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Total Payments</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {filteredPayments.length}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium text-muted-foreground">Latest Payment</span>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {filteredPayments.length > 0 
                        ? format(new Date(filteredPayments[0].paid_at), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>

                {/* Payment Table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Recipient</TableHead>
                        <TableHead className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Amount
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Payment Method</TableHead>
                        <TableHead className="font-semibold text-foreground">Reference</TableHead>
                        <TableHead className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Notes
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} className="table-row-hover">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span className="font-medium">
                                {format(new Date(payment.paid_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{payment.recipient_name}</div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {payment.recipient_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-accent" />
                              <span className="font-semibold text-foreground">
                                {formatCurrency(payment.amount)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {payment.currency_code}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentMethodBadge(payment.payment_method)}>
                              {getPaymentMethodDisplay(payment.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {payment.reference || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {payment.memo || 'No notes'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditPayment(payment)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Edit Payment Record</DialogTitle>
                                    <DialogDescription>
                                      Update the vendor payment record details.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                    <div>
                                      <Label htmlFor="property_id">Property <span className="text-destructive">*</span></Label>
                                      <Select
                                        value={editFormData.property_id || ''}
                                        onValueChange={(value) => setEditFormData({...editFormData, property_id: value})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select property" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {properties.map((property) => (
                                            <SelectItem key={property.id} value={property.id}>
                                              {property.address}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label htmlFor="recipient_type">Recipient Type</Label>
                                      <Select
                                        value={editFormData.recipient_type || 'vendor'}
                                        onValueChange={(value) => setEditFormData({...editFormData, recipient_type: value as 'vendor' | 'owner' | 'other'})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="vendor">Vendor</SelectItem>
                                          <SelectItem value="owner">Owner</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="recipient_name">Recipient Name <span className="text-destructive">*</span></Label>
                                      <Input
                                        id="recipient_name"
                                        value={editFormData.recipient_name || ''}
                                        onChange={(e) => setEditFormData({...editFormData, recipient_name: e.target.value})}
                                        placeholder="Enter recipient name"
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                                      <div className="relative">
                                        <Input
                                          id="amount"
                                          type="number"
                                          step="0.01"
                                          value={editFormData.amount || ''}
                                          onChange={(e) => setEditFormData({...editFormData, amount: parseFloat(e.target.value) || 0})}
                                          placeholder="0.00"
                                          className="pl-8"
                                        />
                                        <DollarSign className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="payment_method">Payment Method <span className="text-destructive">*</span></Label>
                                      <PaymentMethodSelect
                                        value={editFormData.payment_method || ''}
                                        onValueChange={(value) => setEditFormData({...editFormData, payment_method: value})}
                                        placeholder="Select payment method"
                                        type="payments"
                                        className="w-full"
                                        onAddNew={handleAddNewPaymentMethod}
                                        manualMethods={manualPaymentMethods}
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="reference">Reference/Confirmation</Label>
                                      <Input
                                        id="reference"
                                        value={editFormData.reference || ''}
                                        onChange={(e) => setEditFormData({...editFormData, reference: e.target.value})}
                                        placeholder="Check number, confirmation code, etc."
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="memo">Notes/Memo</Label>
                                      <Textarea
                                        id="memo"
                                        value={editFormData.memo || ''}
                                        onChange={(e) => setEditFormData({...editFormData, memo: e.target.value})}
                                        placeholder="Payment description, invoice number, or notes"
                                        rows={3}
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="paid_at">Payment Date <span className="text-destructive">*</span></Label>
                                      <Input
                                        id="paid_at"
                                        type="datetime-local"
                                        value={editFormData.paid_at || ''}
                                        onChange={(e) => setEditFormData({...editFormData, paid_at: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                  
                                  <DialogFooter>
                                    <Button variant="outline" onClick={handleCancelEdit}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleSaveEdit} disabled={loading}>
                                      {loading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this payment record? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePayment(payment.id!)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      </CollapsibleContent>
      
      {/* Manual Payment Method Modal */}
      <ManualPaymentMethodModal
        open={showManualPaymentMethod}
        onOpenChange={setShowManualPaymentMethod}
        onSave={handleSaveManualPaymentMethod}
      />
    </Collapsible>
  );
};

export default VendorPaymentHistory;