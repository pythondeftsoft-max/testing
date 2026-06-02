import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminRentPayments } from '@/hooks/useAdminRentTransactions';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export const RentPaymentsTable = () => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    paymentSource: 'all',
    dateFrom: '',
    dateTo: '',
    offset: 0,
    limit: 50,
  });

  const { data, isLoading, error } = useAdminRentPayments(filters);

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
    // CSV export logic
    console.log('Exporting to CSV...');
  };

  return (
    <div className="space-y-4">
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
                  placeholder="Search tenant, landlord, or property..."
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
              Export CSV
            </Button>
          </div>

          {/* Summary Stats */}
          {data?.summary && (
            <div className="flex gap-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Shown</p>
                <p className="text-lg font-semibold">{data.summary.totalShown} transactions</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(data.summary.platformFees)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net to Landlords</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.netToLandlords)}</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead className="text-right">Net to PM</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-destructive">
                      Error loading payments
                    </TableCell>
                  </TableRow>
                ) : data?.payments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.payments?.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{payment.property?.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.property?.city}, {payment.property?.state}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.unit?.unit_number || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.tenant?.first_name} {payment.tenant?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.tenant?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.property?.owner?.first_name} {payment.property?.owner?.last_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.property?.owner?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-primary font-medium">
                            {formatCurrency(payment.platform_fee_amount)}
                          </span>
                          {payment.tenant_fee_amount > 0 && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>Tenant: {formatCurrency(payment.tenant_fee_amount)}</span>
                              {payment.platform_fee_amount > payment.tenant_fee_amount && (
                                <span>• PM: {formatCurrency(payment.platform_fee_amount - payment.tenant_fee_amount)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.net_amount_to_pm)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            payment.source_type === 'Stripe' 
                              ? 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950/30' 
                              : payment.source_type === 'Plaid Tracked' 
                                ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30'
                                : ''
                          }
                        >
                          {payment.source_type || payment.payment_source}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filters.offset + 1} to{' '}
              {Math.min(filters.offset + filters.limit, data?.summary?.totalShown || 0)} of{' '}
              {data?.summary?.totalShown || 0} results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                disabled={filters.offset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                disabled={!data?.payments || data.payments.length < filters.limit}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
