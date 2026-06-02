import { useState, useEffect } from 'react';
import { useAdminRentPayments, useRentPaymentStats } from '@/hooks/useAdminRentTransactions';
import { useAdminHAPPayments, useHAPPaymentStats } from '@/hooks/useAdminHAPTransactions';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Payment {
  id: string;
  property_address: string;
  unit_number?: string;
  tenant_name: string;
  tenant_email: string;
  landlord_name: string;
  payment_type: 'Tenant Rent' | 'HAP Voucher';
  payment_source: string;
  source_type: string;
  amount: number;
  payment_date: string;
  status: string;
  display_name?: string;
  reference_number?: string;
}

export function RentTrackingLog() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: rentData, isLoading: rentLoading } = useAdminRentPayments({});
  const { data: hapData, isLoading: hapLoading } = useAdminHAPPayments({});
  const { data: rentStats } = useRentPaymentStats();
  const { data: hapStats } = useHAPPaymentStats();

  useEffect(() => {
    if (!rentLoading && !hapLoading) {
      combinePayments();
    }
  }, [rentData, hapData, rentLoading, hapLoading]);

  const combinePayments = () => {
    try {
      const rentPayments: Payment[] = (rentData?.payments || []).map((payment: any) => ({
        id: payment.id,
        property_address: payment.property_address || 'Unknown',
        unit_number: payment.unit_number,
        tenant_name: payment.tenant_name || 'Unknown',
        tenant_email: payment.tenant_email || '',
        landlord_name: payment.landlord_name || 'Unknown',
        payment_type: 'Tenant Rent' as const,
        payment_source: payment.payment_source || 'Unknown',
        source_type: payment.source_type || 'Manual',
        amount: payment.amount || 0,
        payment_date: payment.payment_date,
        status: payment.status || 'pending',
        display_name: payment.display_name || 'Manual Entry',
        reference_number: payment.reference_number,
      }));

      const hapPayments: Payment[] = (hapData?.payments || []).map((payment: any) => ({
        id: payment.id,
        property_address: payment.property_address || 'Unknown',
        unit_number: payment.unit_number,
        tenant_name: payment.tenant_name || 'Unknown',
        tenant_email: payment.tenant_email || '',
        landlord_name: payment.landlord_name || 'Unknown',
        payment_type: 'HAP Voucher' as const,
        payment_source: 'HAP',
        source_type: payment.source_type || 'Plaid Tracked',
        amount: payment.amount || 0,
        payment_date: payment.payment_date,
        status: payment.status || 'pending',
        display_name: payment.display_name || 'HAP Payment',
        reference_number: payment.reference_number,
      }));

      const combinedPayments = [...rentPayments, ...hapPayments].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      setPayments(combinedPayments);
      setLoading(false);
    } catch (error) {
      console.error('Error combining payments:', error);
      toast.error('Failed to load rent tracking data');
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Property', 'Unit', 'Tenant', 'Landlord', 'Type', 'Source', 'Amount', 'Date', 'Status', 'Payment Name', 'Reference'];
    const rows = payments.map(p => [
      p.property_address,
      p.unit_number || 'N/A',
      p.tenant_name,
      p.landlord_name,
      p.payment_type,
      p.payment_source,
      `$${p.amount.toFixed(2)}`,
      format(new Date(p.payment_date), 'MMM d, yyyy'),
      p.status,
      p.display_name || 'N/A',
      p.reference_number || 'N/A'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-tracking-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Rent tracking data exported to CSV');
  };

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'property_address',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.property_address}</div>
          {row.original.unit_number && (
            <div className="text-sm text-muted-foreground">Unit {row.original.unit_number}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.tenant_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.tenant_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'landlord_name',
      header: 'Landlord',
    },
    {
      accessorKey: 'payment_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.payment_type === 'Tenant Rent' ? 'default' : 'secondary'}>
          {row.original.payment_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'source_type',
      header: 'Source',
      cell: ({ row }) => {
        const sourceType = row.original.source_type;
        const variant = sourceType === 'Stripe' ? 'default' : sourceType === 'Plaid Tracked' ? 'secondary' : 'outline';
        return (
          <Badge variant={variant}>
            {sourceType}
          </Badge>
        );
      },
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
      accessorKey: 'payment_date',
      header: 'Payment Date',
      cell: ({ row }) => format(new Date(row.original.payment_date), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status.toLowerCase();
        let variant: 'success' | 'outline' | 'danger' | 'secondary' = 'outline';
        
        if (status === 'completed' || status === 'paid' || status === 'verified' || status === 'received') variant = 'success';
        else if (status === 'failed' || status === 'late') variant = 'danger';
        else if (status === 'pending') variant = 'secondary';
        
        return (
          <Badge variant={variant} className="capitalize">
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'display_name',
      header: 'Payment Name',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.original.display_name}>
          {row.original.display_name || 'N/A'}
        </div>
      ),
    },
  ];

  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.property_address.toLowerCase().includes(searchLower) ||
      payment.tenant_name.toLowerCase().includes(searchLower) ||
      payment.landlord_name.toLowerCase().includes(searchLower) ||
      payment.unit_number?.toLowerCase().includes(searchLower)
    );
  });

  const totalRent = payments
    .filter(p => p.payment_type === 'Tenant Rent')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalHAP = payments
    .filter(p => p.payment_type === 'HAP Voucher')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPayments = payments.length;
  const avgPayment = totalPayments > 0 ? (totalRent + totalHAP) / totalPayments : 0;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rent Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRent.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total HAP Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalHAP.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPayment.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by property, tenant, or landlord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold">{filteredPayments.length}</span> of <span className="font-semibold">{totalPayments}</span> payments
      </div>

      <DataTable columns={columns} data={filteredPayments} />
    </div>
  );
}
