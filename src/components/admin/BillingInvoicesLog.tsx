import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  created: number;
  due_date: number | null;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

export function BillingInvoicesLog() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('admin-list-all-invoices', {
        body: {},
      });

      if (error) throw error;

      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load billing invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Invoice #', 'User', 'Email', 'Plan', 'Amount Due', 'Amount Paid', 'Status', 'Created', 'Due Date', 'Period'];
    const rows = invoices.map(inv => [
      inv.invoice_number,
      inv.user_name,
      inv.user_email,
      inv.plan_name,
      `$${(inv.amount_due / 100).toFixed(2)}`,
      `$${(inv.amount_paid / 100).toFixed(2)}`,
      inv.status,
      format(new Date(inv.created * 1000), 'MMM d, yyyy'),
      inv.due_date ? format(new Date(inv.due_date * 1000), 'MMM d, yyyy') : 'N/A',
      `${format(new Date(inv.period_start * 1000), 'MMM d')} - ${format(new Date(inv.period_end * 1000), 'MMM d, yyyy')}`
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Invoices exported to CSV');
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoice_number',
      header: 'Invoice #',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.invoice_number}</div>
      ),
    },
    {
      accessorKey: 'user_name',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.user_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'plan_name',
      header: 'Plan',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.plan_name || 'Unknown'}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount_due',
      header: 'Amount Due',
      cell: ({ row }) => (
        <div className="font-medium">
          ${(row.original.amount_due / 100).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'amount_paid',
      header: 'Amount Paid',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ${(row.original.amount_paid / 100).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: 'success' | 'outline' | 'danger' | 'neutral' = 'outline';
        
        if (status === 'paid') variant = 'success';
        else if (status === 'void' || status === 'uncollectible') variant = 'danger';
        
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created * 1000), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => {
        if (!row.original.due_date) return <span className="text-muted-foreground">N/A</span>;
        return format(new Date(row.original.due_date * 1000), 'MMM d, yyyy');
      },
    },
    {
      accessorKey: 'period',
      header: 'Period',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.period_start * 1000), 'MMM d')} - {format(new Date(row.original.period_end * 1000), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.invoice_pdf && (
            <a
              href={row.original.invoice_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              PDF <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {row.original.hosted_invoice_url && (
            <a
              href={row.original.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              Stripe <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ),
    },
  ];

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.user_name.toLowerCase().includes(searchLower) ||
      invoice.user_email.toLowerCase().includes(searchLower)
    );
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const outstanding = totalInvoiced - totalCollected;
  const invoiceCount = invoices.length;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalInvoiced / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(totalCollected / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${(outstanding / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by invoice #, user name, or email..."
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
        Showing <span className="font-semibold">{filteredInvoices.length}</span> of <span className="font-semibold">{invoiceCount}</span> invoices
      </div>

      <DataTable columns={columns} data={filteredInvoices} />
    </div>
  );
}
