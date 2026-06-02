import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLandlordRentPayments, useLandlordRentPaymentStats } from '@/hooks/useLandlordRentTransactions';
import { Search, Download, ChevronLeft, ChevronRight, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface LandlordRentPaymentsTableProps {
  landlordId: string;
  portfolioId?: string;
}

export const LandlordRentPaymentsTable = ({ landlordId, portfolioId }: LandlordRentPaymentsTableProps) => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    paymentSource: 'all',
    dateFrom: '',
    dateTo: '',
    offset: 0,
    limit: 50,
  });

  const { data, isLoading, error } = useLandlordRentPayments(landlordId, portfolioId, filters);
  const { data: stats } = useLandlordRentPaymentStats(landlordId, portfolioId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const handleExport = () => {
    console.log('Exporting to CSV...');
    // TODO: Implement CSV export
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {stats?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.summary.totalCollected)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.summary.totalCollectedThisMonth)}</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.summary.failedPayments}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rent Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenant or property..."
                  className="pl-8"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value, offset: 0 })}
                />
              </div>
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value, offset: 0 })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentSource}
              onValueChange={(value) => setFilters({ ...filters, paymentSource: value, offset: 0 })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="tenant">Tenant Direct</SelectItem>
                <SelectItem value="hap">HAP</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, offset: 0 })}
              className="w-[150px]"
            />

            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, offset: 0 })}
              className="w-[150px]"
            />

            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Error loading payments</div>
          ) : data?.payments && data.payments.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{payment.profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payment.properties?.address || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filters.offset + 1}-{Math.min(filters.offset + filters.limit, filters.offset + data.payments.length)} payments
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                    disabled={filters.offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                    disabled={data.payments.length < filters.limit}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No rent payments found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
