import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CashFlowTransaction {
  id: string;
  amount: number;
  transaction_type: 'receipt' | 'disbursement';
  category: string;
  description: string | null;
  transaction_date: string;
}

interface PropertyCashFlowManagerProps {
  propertyId: string;
  propertyAddress: string;
}

const RECEIPT_CATEGORIES = [
  { value: 'rental_income', label: 'Rental Income' },
  { value: 'security_deposit', label: 'Security Deposit Received' },
  { value: 'owner_contribution', label: 'Owner Contribution' },
  { value: 'other_income', label: 'Other Income' },
];

const DISBURSEMENT_CATEGORIES = [
  { value: 'operating_expense', label: 'Operating Expense' },
  { value: 'mortgage_payment', label: 'Mortgage Payment' },
  { value: 'owner_draw', label: 'Owner Draw' },
  { value: 'other_disbursement', label: 'Other Disbursement' },
];

export const PropertyCashFlowManager = ({ propertyId, propertyAddress }: PropertyCashFlowManagerProps) => {
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    transaction_type: 'receipt' as 'receipt' | 'disbursement',
    category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['property-cash-flow', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_cash_flow')
        .select('*')
        .eq('property_id', propertyId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as CashFlowTransaction[];
    },
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<CashFlowTransaction, 'id'>) => {
      const { data, error } = await supabase
        .from('property_cash_flow')
        .insert([{
          property_id: propertyId,
          ...transaction,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-cash-flow', propertyId] });
      setNewTransaction({
        amount: '',
        transaction_type: 'receipt',
        category: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      toast({
        title: 'Success',
        description: 'Cash flow transaction added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction.',
        variant: 'destructive',
      });
    },
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('property_cash_flow')
        .delete()
        .eq('id', transactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-cash-flow', propertyId] });
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction.',
        variant: 'destructive',
      });
    },
  });

  const handleAddTransaction = useCallback(() => {
    if (!newTransaction.amount || !newTransaction.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in amount and category.',
        variant: 'destructive',
      });
      return;
    }

    addTransaction.mutate({
      amount: parseFloat(newTransaction.amount),
      transaction_type: newTransaction.transaction_type,
      category: newTransaction.category,
      description: newTransaction.description || null,
      transaction_date: newTransaction.transaction_date,
    });
  }, [newTransaction, addTransaction, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryOptions = () => {
    return newTransaction.transaction_type === 'receipt' ? RECEIPT_CATEGORIES : DISBURSEMENT_CATEGORIES;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cash Flow Transactions - {propertyAddress}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track individual cash receipts and disbursements for accurate Property Statement reporting.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Add New Transaction Form */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Add New Transaction</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transaction_type">Transaction Type</Label>
              <Select
                value={newTransaction.transaction_type}
                onValueChange={(value: 'receipt' | 'disbursement') => 
                  setNewTransaction(prev => ({ ...prev, transaction_type: value, category: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Cash Receipt</SelectItem>
                  <SelectItem value="disbursement">Cash Disbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {getCategoryOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="transaction_date">Date</Label>
              <Input
                id="transaction_date"
                type="date"
                value={newTransaction.transaction_date}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this transaction..."
              rows={2}
            />
          </div>

          <Button 
            onClick={handleAddTransaction}
            disabled={addTransaction.isPending || !newTransaction.amount || !newTransaction.category}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {addTransaction.isPending ? 'Adding...' : 'Add Transaction'}
          </Button>
        </div>

        <Separator />

        {/* Transaction History */}
        <div>
          <h3 className="font-medium mb-4">Recent Transactions</h3>
          
          {isLoading ? (
            <p className="text-muted-foreground">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions recorded yet. Add your first transaction above.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={transaction.transaction_type === 'receipt' ? 'default' : 'secondary'}>
                      {transaction.transaction_type === 'receipt' ? 'Receipt' : 'Disbursement'}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {RECEIPT_CATEGORIES.find(c => c.value === transaction.category)?.label || 
                         DISBURSEMENT_CATEGORIES.find(c => c.value === transaction.category)?.label || 
                         transaction.category}
                      </p>
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTransaction.mutate(transaction.id)}
                      disabled={deleteTransaction.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {transactions.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Receipts</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(
                    transactions
                      .filter(t => t.transaction_type === 'receipt')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Disbursements</p>
                <p className="font-medium text-red-600">
                  {formatCurrency(
                    transactions
                      .filter(t => t.transaction_type === 'disbursement')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Cash Flow</p>
                <p className="font-medium">
                  {formatCurrency(
                    transactions
                      .filter(t => t.transaction_type === 'receipt')
                      .reduce((sum, t) => sum + t.amount, 0) -
                    transactions
                      .filter(t => t.transaction_type === 'disbursement')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};