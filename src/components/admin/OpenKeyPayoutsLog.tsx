import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Payout {
  id: string;
  landlord_name: string;
  landlord_email: string;
  landlord_company: string | null;
  property_address: string | null;
  amount: number;
  payout_method: string;
  status: string;
  batch_name: string | null;
  checkbook_id: string | null;
  created_at: string;
  processed_at: string | null;
}

interface BatchSummary {
  batch_id: string;
  batch_name: string;
  statement_period_start: string;
  statement_period_end: string;
  total_payouts: number;
  total_amount: number;
  successful_count: number;
  successful_amount: number;
  failed_count: number;
  failed_amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
}

export function OpenKeyPayoutsLog() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'all' | 'batches'>('all');

  useEffect(() => {
    fetchPayoutsAndBatches();
  }, []);

  const fetchPayoutsAndBatches = async () => {
    try {
      setLoading(true);
      
      // Fetch individual payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          id,
          amount,
          payout_method,
          status,
          checkbook_id,
          created_at,
          processed_at,
          properties (
            id,
            address,
            street_address
          ),
          landlord:profiles!landlord_id (
            first_name,
            last_name,
            email,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Fetch bulk payout batches with items
      const { data: batchesData, error: batchesError } = await supabase
        .from('bulk_payout_batches')
        .select(`
          id,
          batch_name,
          statement_period_start,
          statement_period_end,
          status,
          created_at,
          processed_at,
          bulk_payout_items (
            id,
            amount,
            status,
            properties (
              id,
              address,
              street_address
            ),
            landlord:profiles!landlord_id (
              first_name,
              last_name,
              email,
              company_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      // Format individual payouts
      const formattedPayouts: Payout[] = (payoutsData || []).map((payout: any) => {
        const landlord = payout.landlord;
        const property = payout.properties;
        
        return {
          id: payout.id,
          landlord_name: `${landlord?.first_name || ''} ${landlord?.last_name || ''}`.trim(),
          landlord_email: landlord?.email || '',
          landlord_company: landlord?.company_name,
          property_address: property?.street_address || property?.address,
          amount: payout.amount || 0,
          payout_method: payout.payout_method || 'Unknown',
          status: payout.status || 'draft',
          batch_name: null,
          checkbook_id: payout.checkbook_id,
          created_at: payout.created_at,
          processed_at: payout.processed_at,
        };
      });

      // Format batch payouts (flatten items)
      const batchPayouts: Payout[] = [];
      const batchSummaries: BatchSummary[] = [];

      (batchesData || []).forEach((batch: any) => {
        const items = batch.bulk_payout_items || [];
        
        items.forEach((item: any) => {
          const landlord = item.landlord;
          const property = item.properties;
          
          batchPayouts.push({
            id: item.id,
            landlord_name: `${landlord?.first_name || ''} ${landlord?.last_name || ''}`.trim(),
            landlord_email: landlord?.email || '',
            landlord_company: landlord?.company_name,
            property_address: property?.street_address || property?.address,
            amount: item.amount || 0,
            payout_method: 'Batch Payout',
            status: item.status || 'pending',
            batch_name: batch.batch_name,
            checkbook_id: null,
            created_at: batch.created_at,
            processed_at: batch.processed_at,
          });
        });

        // Create batch summary
        const successfulItems = items.filter((i: any) => i.status === 'completed' || i.status === 'paid');
        const failedItems = items.filter((i: any) => i.status === 'failed');
        
        batchSummaries.push({
          batch_id: batch.id,
          batch_name: batch.batch_name,
          statement_period_start: batch.statement_period_start,
          statement_period_end: batch.statement_period_end,
          total_payouts: items.length,
          total_amount: items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
          successful_count: successfulItems.length,
          successful_amount: successfulItems.reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
          failed_count: failedItems.length,
          failed_amount: failedItems.reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
          status: batch.status,
          created_at: batch.created_at,
          processed_at: batch.processed_at,
        });
      });

      setPayouts([...formattedPayouts, ...batchPayouts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setBatches(batchSummaries);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load OpenKey payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (view === 'all') {
      const headers = ['Landlord', 'Company', 'Property', 'Amount', 'Method', 'Status', 'Batch', 'Created', 'Processed'];
      const rows = payouts.map(p => [
        p.landlord_name,
        p.landlord_company || 'N/A',
        p.property_address || 'N/A',
        `$${p.amount.toFixed(2)}`,
        p.payout_method,
        p.status,
        p.batch_name || 'Individual',
        format(new Date(p.created_at), 'MMM d, yyyy'),
        p.processed_at ? format(new Date(p.processed_at), 'MMM d, yyyy') : 'Pending'
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openkey-payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const headers = ['Batch Name', 'Period', 'Total Payouts', 'Total Amount', 'Successful', 'Failed', 'Status', 'Created'];
      const rows = batches.map(b => [
        b.batch_name,
        `${format(new Date(b.statement_period_start), 'MMM d')} - ${format(new Date(b.statement_period_end), 'MMM d, yyyy')}`,
        b.total_payouts.toString(),
        `$${b.total_amount.toFixed(2)}`,
        `${b.successful_count} ($${b.successful_amount.toFixed(2)})`,
        `${b.failed_count} ($${b.failed_amount.toFixed(2)})`,
        b.status,
        format(new Date(b.created_at), 'MMM d, yyyy')
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openkey-payout-batches-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success('Payouts exported to CSV');
  };

  const payoutColumns: ColumnDef<Payout>[] = [
    {
      accessorKey: 'landlord_name',
      header: 'Landlord',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.landlord_name}</div>
          {row.original.landlord_company && (
            <div className="text-sm text-muted-foreground">{row.original.landlord_company}</div>
          )}
          <div className="text-xs text-muted-foreground">{row.original.landlord_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'property_address',
      header: 'Property',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.property_address || <span className="text-muted-foreground">Multiple</span>}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ${row.original.amount.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'payout_method',
      header: 'Method',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.payout_method.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status.toLowerCase();
        let variant: 'success' | 'outline' | 'danger' = 'outline';
        
        if (status === 'completed' || status === 'paid') variant = 'success';
        else if (status === 'failed' || status === 'cancelled') variant = 'danger';
        
        return (
          <Badge variant={variant} className="capitalize">
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'batch_name',
      header: 'Batch',
      cell: ({ row }) => {
        const batchName = row.original.batch_name;
        if (!batchName) return <Badge variant="outline">Individual</Badge>;
        
        return (
          <Badge variant="secondary" className="text-xs">
            {batchName}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'processed_at',
      header: 'Processed',
      cell: ({ row }) => {
        if (!row.original.processed_at) return <span className="text-muted-foreground">Pending</span>;
        return format(new Date(row.original.processed_at), 'MMM d, yyyy');
      },
    },
  ];

  const batchColumns: ColumnDef<BatchSummary>[] = [
    {
      accessorKey: 'batch_name',
      header: 'Batch Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.batch_name}</div>
      ),
    },
    {
      accessorKey: 'period',
      header: 'Statement Period',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.statement_period_start), 'MMM d')} - {format(new Date(row.original.statement_period_end), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      accessorKey: 'total_payouts',
      header: 'Total Payouts',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.total_payouts}</div>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: 'Total Amount',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ${row.original.total_amount.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'successful',
      header: 'Successful',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-green-600">{row.original.successful_count}</div>
          <div className="text-xs text-muted-foreground">${row.original.successful_amount.toFixed(2)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'failed',
      header: 'Failed',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-red-600">{row.original.failed_count}</div>
          <div className="text-xs text-muted-foreground">${row.original.failed_amount.toFixed(2)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status.toLowerCase();
        let variant: 'success' | 'outline' | 'danger' = 'outline';
        
        if (status === 'completed') variant = 'success';
        else if (status === 'failed') variant = 'danger';
        
        return (
          <Badge variant={variant} className="capitalize">
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
  ];

  const filteredPayouts = payouts.filter(payout => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payout.landlord_name.toLowerCase().includes(searchLower) ||
      payout.landlord_email.toLowerCase().includes(searchLower) ||
      payout.landlord_company?.toLowerCase().includes(searchLower) ||
      payout.property_address?.toLowerCase().includes(searchLower) ||
      payout.batch_name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredBatches = batches.filter(batch => {
    const searchLower = searchTerm.toLowerCase();
    return batch.batch_name.toLowerCase().includes(searchLower);
  });

  const totalPaidOut = payouts
    .filter(p => p.status === 'completed' || p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending' || p.status === 'draft')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const payoutCount = payouts.length;
  const avgPayout = payoutCount > 0 ? payouts.reduce((sum, p) => sum + p.amount, 0) / payoutCount : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaidOut.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${pendingPayouts.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payout Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payoutCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPayout.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'all' | 'batches')} className="w-full">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All Payouts</TabsTrigger>
            <TabsTrigger value="batches">Batch Summary</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Input
              placeholder={view === 'all' ? 'Search by landlord, property, or batch...' : 'Search by batch name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Showing <span className="font-semibold">{filteredPayouts.length}</span> of <span className="font-semibold">{payoutCount}</span> payouts
          </div>
          <DataTable columns={payoutColumns} data={filteredPayouts} />
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Showing <span className="font-semibold">{filteredBatches.length}</span> of <span className="font-semibold">{batches.length}</span> batches
          </div>
          <DataTable columns={batchColumns} data={filteredBatches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
