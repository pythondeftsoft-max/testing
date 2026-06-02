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

interface SubscriptionTransaction {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  processed_at: string;
  stripe_payment_intent_id: string | null;
  failure_reason: string | null;
  user_name: string;
  user_email: string;
  user_type: string;
  company_name: string | null;
  plan_type: string;
}

export function SubscriptionPaymentsLog() {
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subscription_autopay_transactions')
        .select(`
          id,
          amount,
          currency_code,
          status,
          processed_at,
          stripe_payment_intent_id,
          failure_reason,
          subscription_autopay_schedules!inner (
            subscriptions!inner (
              plan_type,
              profiles!inner (
                id,
                first_name,
                last_name,
                email,
                user_type,
                company_name
              )
            )
          )
        `)
        .order('processed_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions: SubscriptionTransaction[] = (data || []).map((transaction: any) => {
        const profile = transaction.subscription_autopay_schedules?.subscriptions?.profiles;
        const subscription = transaction.subscription_autopay_schedules?.subscriptions;
        
        return {
          id: transaction.id,
          amount: transaction.amount,
          currency_code: transaction.currency_code,
          status: transaction.status,
          processed_at: transaction.processed_at,
          stripe_payment_intent_id: transaction.stripe_payment_intent_id,
          failure_reason: transaction.failure_reason,
          user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          user_email: profile?.email || '',
          user_type: profile?.user_type || '',
          company_name: profile?.company_name,
          plan_type: subscription?.plan_type || 'Free',
        };
      });

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching subscription transactions:', error);
      toast.error('Failed to load subscription transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['User', 'Email', 'Company', 'Role', 'Plan', 'Amount', 'Date', 'Status', 'Stripe ID', 'Failure Reason'];
    const rows = transactions.map(t => [
      t.user_name,
      t.user_email,
      t.company_name || 'N/A',
      t.user_type,
      t.plan_type,
      `${t.currency_code} ${t.amount.toFixed(2)}`,
      format(new Date(t.processed_at), 'MMM d, yyyy'),
      t.status,
      t.stripe_payment_intent_id || 'N/A',
      t.failure_reason || 'N/A'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Subscription payments exported to CSV');
  };

  const columns: ColumnDef<SubscriptionTransaction>[] = [
    {
      accessorKey: 'user_name',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user_name}</div>
          {row.original.company_name && (
            <div className="text-sm text-muted-foreground">{row.original.company_name}</div>
          )}
          <div className="text-xs text-muted-foreground">{row.original.user_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'user_type',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.user_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'plan_type',
      header: 'Plan',
      cell: ({ row }) => (
        <Badge variant={row.original.plan_type === 'Free' ? 'outline' : 'default'}>
          {row.original.plan_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.currency_code} {row.original.amount.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'processed_at',
      header: 'Transaction Date',
      cell: ({ row }) => format(new Date(row.original.processed_at), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: 'success' | 'danger' | 'outline' = 'success';
        
        if (status === 'failed') variant = 'danger';
        
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'stripe_payment_intent_id',
      header: 'Stripe ID',
      cell: ({ row }) => {
        const stripeId = row.original.stripe_payment_intent_id;
        if (!stripeId) return <span className="text-muted-foreground">N/A</span>;
        
        return (
          <a
            href={`https://dashboard.stripe.com/payments/${stripeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            {stripeId.substring(0, 15)}...
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      },
    },
    {
      accessorKey: 'failure_reason',
      header: 'Failure Reason',
      cell: ({ row }) => {
        const reason = row.original.failure_reason;
        if (!reason) return null;
        
        return (
          <div className="text-sm text-red-600 max-w-xs truncate" title={reason}>
            {reason}
          </div>
        );
      },
    },
  ];

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.user_name.toLowerCase().includes(searchLower) ||
      transaction.user_email.toLowerCase().includes(searchLower) ||
      transaction.stripe_payment_intent_id?.toLowerCase().includes(searchLower) ||
      transaction.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalRevenue = transactions
    .filter(t => t.status === 'succeeded')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalTransactions = transactions.length;
  const successfulTransactions = transactions.filter(t => t.status === 'succeeded').length;
  const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions * 100).toFixed(1) : '0';
  const avgPayment = successfulTransactions > 0 ? totalRevenue / successfulTransactions : 0;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
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
            placeholder="Search by user, email, company, or Stripe ID..."
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
        Showing <span className="font-semibold">{filteredTransactions.length}</span> of <span className="font-semibold">{totalTransactions}</span> transactions
      </div>

      <DataTable columns={columns} data={filteredTransactions} />
    </div>
  );
}
