import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Filter, ExternalLink } from 'lucide-react';
import { useAdminAllInvoices } from '@/hooks/useAdminBilling';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

export const PaymentHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  
  const { data, isLoading, error } = useAdminAllInvoices();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'open':
        return 'secondary';
      case 'void':
      case 'uncollectible':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredInvoices = data?.invoices?.filter(invoice => {
    // Search filter
    const matchesSearch = !searchQuery || 
      invoice.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.plan_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange !== 'all') {
      const invoiceDate = new Date(invoice.created * 1000);
      const now = new Date();
      const daysAgo = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 0;
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      matchesDate = invoiceDate >= cutoffDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid / 100), 0);
  const totalTransactions = filteredInvoices.length;

  const exportToCSV = () => {
    const headers = ['Date', 'Invoice #', 'User', 'Email', 'Plan', 'Amount', 'Status'];
    const rows = filteredInvoices.map(invoice => [
      format(new Date(invoice.created * 1000), 'yyyy-MM-dd HH:mm'),
      invoice.number || invoice.id,
      invoice.user_name || 'Unknown',
      invoice.user_email || invoice.customer_email || 'Unknown',
      invoice.plan_name,
      `$${(invoice.amount_paid / 100).toFixed(2)}`,
      invoice.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-destructive text-center">Failed to load payment history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl">{totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Payment</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(totalTransactions > 0 ? totalRevenue / totalTransactions : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View and export all payment transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, invoice, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="void">Void</SelectItem>
                <SelectItem value="uncollectible">Uncollectible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" disabled={filteredInvoices.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Payment Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading payment history...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(invoice.created * 1000), 'HH:mm')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.number || invoice.id.substring(0, 12)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.user_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.user_email || invoice.customer_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{invoice.plan_name}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.amount_paid / 100)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={invoice.hosted_invoice_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
