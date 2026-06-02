import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit2, DollarSign, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/reportUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertyAccountsReceivableTabProps {
  property: any;
  onUpdate: () => void;
}

export const PropertyAccountsReceivableTab: React.FC<PropertyAccountsReceivableTabProps> = ({ 
  property, 
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    outstanding_balance: property.outstanding_balance || 0,
    last_payment_amount: property.last_payment_amount || 0,
    last_payment_date: property.last_payment_date || '',
    total_charges_mtd: property.total_charges_mtd || 0,
    total_payments_mtd: property.total_payments_mtd || 0
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update(formData)
        .eq('id', property.id);

      if (error) throw error;

      toast.success('Financial data updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating financial data:', error);
      toast.error('Failed to update financial data');
    }
  };

  const handleCancel = () => {
    setFormData({
      outstanding_balance: property.outstanding_balance || 0,
      last_payment_amount: property.last_payment_amount || 0,
      last_payment_date: property.last_payment_date || '',
      total_charges_mtd: property.total_charges_mtd || 0,
      total_payments_mtd: property.total_payments_mtd || 0
    });
    setIsEditing(false);
  };

  const getPaymentStatus = () => {
    if (!property.outstanding_balance || property.outstanding_balance <= 0) {
      return { label: 'Current', variant: 'default' as const };
    }
    
    const lastPaymentDate = property.last_payment_date ? new Date(property.last_payment_date) : null;
    const daysSincePayment = lastPaymentDate 
      ? Math.floor((new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 3600 * 24))
      : 999;

    if (daysSincePayment <= 30) {
      return { label: 'Current', variant: 'default' as const };
    } else if (daysSincePayment <= 60) {
      return { label: 'Past Due', variant: 'secondary' as const };
    } else {
      return { label: 'Seriously Past Due', variant: 'destructive' as const };
    }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Accounts Receivable</h3>
          <p className="text-sm text-muted-foreground">
            Track outstanding balances and payment history
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={paymentStatus.variant}>
            {paymentStatus.label}
          </Badge>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                Save
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardEnhanced variant="command" className="command-metric-card">
          <CardEnhancedContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(property.outstanding_balance || 0)}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="command" className="command-metric-card">
          <CardEnhancedContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Payment</p>
                <p className="text-xl font-bold">
                  {formatCurrency(property.last_payment_amount || 0)}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="command" className="command-metric-card">
          <CardEnhancedContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MTD Charges</p>
                <p className="text-xl font-bold">
                  {formatCurrency(property.total_charges_mtd || 0)}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="command" className="command-metric-card">
          <CardEnhancedContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MTD Payments</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(property.total_payments_mtd || 0)}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Detailed Form */}
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle>Financial Details</CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="outstanding_balance">Outstanding Balance</Label>
              <Input
                id="outstanding_balance"
                type="number"
                step="0.01"
                value={formData.outstanding_balance}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  outstanding_balance: parseFloat(e.target.value) || 0 
                }))}
                disabled={!isEditing}
                className={formData.outstanding_balance > 0 ? 'text-destructive font-semibold' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_payment_amount">Last Payment Amount</Label>
              <Input
                id="last_payment_amount"
                type="number"
                step="0.01"
                value={formData.last_payment_amount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  last_payment_amount: parseFloat(e.target.value) || 0 
                }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_payment_date">Last Payment Date</Label>
              <Input
                id="last_payment_date"
                type="date"
                value={formData.last_payment_date || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  last_payment_date: e.target.value 
                }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_charges_mtd">Month-to-Date Charges</Label>
              <Input
                id="total_charges_mtd"
                type="number"
                step="0.01"
                value={formData.total_charges_mtd}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  total_charges_mtd: parseFloat(e.target.value) || 0 
                }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_payments_mtd">Month-to-Date Payments</Label>
              <Input
                id="total_payments_mtd"
                type="number"
                step="0.01"
                value={formData.total_payments_mtd}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  total_payments_mtd: parseFloat(e.target.value) || 0 
                }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          {!isEditing && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This data is used to generate accounts receivable reports and track payment performance. 
                Update these fields regularly to maintain accurate financial records.
              </p>
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};