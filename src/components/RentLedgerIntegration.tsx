import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, DollarSign, Calendar, User, Building, Plus, Filter, Download } from 'lucide-react';

interface RentLedgerIntegrationProps {
  propertyId: string;
  className?: string;
}

const RentLedgerIntegration = ({ propertyId, className = '' }: RentLedgerIntegrationProps) => {
  const { toast } = useToast();
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    paymentSource: 'all',
    paymentType: 'all'
  });

  useEffect(() => {
    fetchLedgerEntries();
  }, [propertyId]);

  const fetchLedgerEntries = async () => {
    try {
      let query = supabase
        .from('rent_ledger')
        .select(`
          *,
          profiles(first_name, last_name),
          hap_payments(pha_voucher_number, payment_status)
        `)
        .eq('property_id', propertyId)
        .order('payment_date', { ascending: false });

      // Apply filters
      if (filter.dateFrom) {
        query = query.gte('payment_date', filter.dateFrom);
      }
      if (filter.dateTo) {
        query = query.lte('payment_date', filter.dateTo);
      }
      if (filter.paymentSource !== 'all') {
        query = query.eq('payment_source', filter.paymentSource);
      }
      if (filter.paymentType !== 'all') {
        query = query.eq('payment_type', filter.paymentType);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLedgerEntries(data || []);
    } catch (error) {
      console.error('Error fetching rent ledger:', error);
      toast({
        title: "Error",
        description: "Failed to load rent ledger entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setLoading(true);
    fetchLedgerEntries();
  };

  const resetFilters = () => {
    setFilter({
      dateFrom: '',
      dateTo: '',
      paymentSource: 'all',
      paymentType: 'all'
    });
    setLoading(true);
    fetchLedgerEntries();
  };

  const exportLedger = async () => {
    try {
      // Generate CSV content
      const headers = ['Date', 'Amount', 'Type', 'Source', 'Description', 'Reference', 'Tenant'];
      const csvContent = [
        headers.join(','),
        ...ledgerEntries.map(entry => [
          entry.payment_date,
          entry.amount,
          entry.payment_type,
          entry.payment_source,
          `"${entry.description || ''}"`,
          entry.reference_number || '',
          entry.profiles ? `${entry.profiles.first_name} ${entry.profiles.last_name}` : ''
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rent_ledger_${propertyId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Rent ledger exported successfully"
      });
    } catch (error) {
      console.error('Error exporting ledger:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export rent ledger",
        variant: "destructive"
      });
    }
  };

  const getPaymentSourceBadge = (source: string) => {
    const variants = {
      tenant: { variant: 'default', text: 'Tenant Payment' },
      pha_hap: { variant: 'secondary', text: 'HAP Payment' },
      other: { variant: 'outline', text: 'Other' }
    };

    const config = variants[source as keyof typeof variants] || variants.other;
    return (
      <Badge variant={config.variant as any}>
        {config.text}
      </Badge>
    );
  };

  const getTotalsBySource = () => {
    const totals = {
      tenant: 0,
      pha_hap: 0,
      other: 0,
      total: 0
    };

    ledgerEntries.forEach(entry => {
      const amount = parseFloat(entry.amount);
      totals[entry.payment_source as keyof typeof totals] += amount;
      totals.total += amount;
    });

    return totals;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = getTotalsBySource();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Rent Ledger
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Rent Ledger</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date From</Label>
                      <Input
                        type="date"
                        value={filter.dateFrom}
                        onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date To</Label>
                      <Input
                        type="date"
                        value={filter.dateTo}
                        onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Source</Label>
                      <Select value={filter.paymentSource} onValueChange={(value) => setFilter(prev => ({ ...prev, paymentSource: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="tenant">Tenant Payments</SelectItem>
                          <SelectItem value="pha_hap">HAP Payments</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Type</Label>
                      <Select value={filter.paymentType} onValueChange={(value) => setFilter(prev => ({ ...prev, paymentType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="late_fee">Late Fee</SelectItem>
                          <SelectItem value="security_deposit">Security Deposit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                    <Button onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportLedger}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Collected</div>
            <div className="text-2xl font-bold">${totals.total.toFixed(2)}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Tenant Payments</div>
            <div className="text-xl font-semibold">${totals.tenant.toFixed(2)}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">HAP Payments</div>
            <div className="text-xl font-semibold">${totals.pha_hap.toFixed(2)}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Other Payments</div>
            <div className="text-xl font-semibold">${totals.other.toFixed(2)}</div>
          </div>
        </div>

        {/* Ledger Entries */}
        <div className="space-y-3">
          {ledgerEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rent ledger entries found
            </div>
          ) : (
            ledgerEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">${entry.amount.toFixed(2)}</div>
                    {getPaymentSourceBadge(entry.payment_source)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.description}
                  </div>
                  {entry.reference_number && (
                    <div className="text-xs text-muted-foreground">
                      Ref: {entry.reference_number}
                    </div>
                  )}
                  {entry.profiles && (
                    <div className="text-xs text-muted-foreground">
                      {entry.profiles.first_name} {entry.profiles.last_name}
                    </div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium">
                    {new Date(entry.payment_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.payment_type}
                  </div>
                  {entry.hap_payments && (
                    <div className="text-xs text-green-600">
                      HAP: {entry.hap_payments.payment_status}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RentLedgerIntegration;