import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminHAPPayments } from '@/hooks/useAdminHAPTransactions';
import { Search, Download, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export const HAPPaymentsTable = () => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    offset: 0,
    limit: 50,
  });

  const { data, isLoading, error } = useAdminHAPPayments(filters);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      received: 'default',
      pending: 'secondary',
      late: 'destructive',
      partial: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>HAP Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search voucher number or tenant..."
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
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>


            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, offset: 0 })}
              className="w-[150px]"
            />

            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, offset: 0 })}
              className="w-[150px]"
            />

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Summary Stats */}
          {data?.summary && (
            <div className="flex gap-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Shown</p>
                <p className="text-lg font-semibold">{data.summary.totalShown} payments</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.totalExpected)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(data.summary.totalReceived)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verification Rate</p>
                <p className="text-lg font-semibold">
                  {data.summary.verificationRate.toFixed(1)}%
                </p>
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
                  <TableHead>Voucher #</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Verified</TableHead>
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
                      Error loading HAP payments
                    </TableCell>
                  </TableRow>
                ) : data?.payments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No HAP payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.payments?.map((payment: any) => {
                    const difference = (payment.actual_amount || 0) - (payment.expected_amount || 0);
                    return (
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
                        <TableCell className="font-mono text-sm">
                          {payment.pha_voucher_number || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.expected_amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(payment.actual_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={difference < 0 ? 'text-destructive' : difference > 0 ? 'text-green-600' : ''}>
                            {formatCurrency(Math.abs(difference))}
                            {difference !== 0 && (difference < 0 ? ' short' : ' over')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {payment.is_verified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      </TableRow>
                    );
                  })
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
