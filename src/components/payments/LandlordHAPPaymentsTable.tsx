import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLandlordHAPPayments, useLandlordHAPPaymentStats } from '@/hooks/useLandlordHAPTransactions';
import { Search, Download, ChevronLeft, ChevronRight, Building, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LandlordHAPPaymentsTableProps {
  landlordId: string;
  portfolioId?: string;
}

export const LandlordHAPPaymentsTable = ({ landlordId, portfolioId }: LandlordHAPPaymentsTableProps) => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    offset: 0,
    limit: 50,
  });

  const { data, isLoading, error } = useLandlordHAPPayments(landlordId, portfolioId, filters);
  const { data: stats } = useLandlordHAPPaymentStats(landlordId, portfolioId);

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
      {/* Summary Cards */}
      {stats?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total HAP Received</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.summary.totalHAPReceived)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.summary.totalHAPReceivedThisMonth)}</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending HAP</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.pendingHAP}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties with HAP</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.propertiesWithHAP}</div>
              <p className="text-xs text-muted-foreground">Active vouchers</p>
            </CardContent>
          </Card>
        </div>
      )}

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

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading HAP payments...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Error loading HAP payments</div>
          ) : data?.payments && data.payments.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>HAP Amount</TableHead>
                      <TableHead>Tenant Portion</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{payment.profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payment.properties?.address || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.voucher_number || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.hap_amount || 0)}</TableCell>
                        <TableCell>{formatCurrency(payment.tenant_portion || 0)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency((payment.hap_amount || 0) + (payment.tenant_portion || 0))}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
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
            <div className="text-center py-8 text-muted-foreground">No HAP payments found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
