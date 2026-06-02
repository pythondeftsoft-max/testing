import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyPaymentsSubTabProps {
  propertyPaymentsData: any;
  propertyPaymentStats: any;
  propertyPaymentsLoading: boolean;
  paymentFilters: {
    dateFrom: string;
    dateTo: string;
    status: string;
    paymentType: string;
  };
  setPaymentFilters: (filters: any) => void;
}

export const PropertyPaymentsSubTab: React.FC<PropertyPaymentsSubTabProps> = ({
  propertyPaymentsData,
  propertyPaymentStats,
  propertyPaymentsLoading,
  paymentFilters,
  setPaymentFilters,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination logic
  const payments = propertyPaymentsData?.payments || [];
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters or itemsPerPage change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilters, itemsPerPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Property Payments</h3>
      </div>

      {/* Payment Statistics */}
      {propertyPaymentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${propertyPaymentStats.totalReceived?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${propertyPaymentStats.totalPending?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${propertyPaymentStats.totalOverdue?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${propertyPaymentStats.thisMonth?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={paymentFilters.dateFrom}
                onChange={(e) => setPaymentFilters({ ...paymentFilters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={paymentFilters.dateTo}
                onChange={(e) => setPaymentFilters({ ...paymentFilters, dateTo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={paymentFilters.status}
                onValueChange={(value) => setPaymentFilters({ ...paymentFilters, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select
                value={paymentFilters.paymentType}
                onValueChange={(value) => setPaymentFilters({ ...paymentFilters, paymentType: value })}
              >
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="rent">Tenant Rent</SelectItem>
                  <SelectItem value="hap">HAP Voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(paymentFilters.dateFrom || paymentFilters.dateTo || paymentFilters.status !== 'all' || paymentFilters.paymentType !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setPaymentFilters({ dateFrom: '', dateTo: '', status: 'all', paymentType: 'all' })}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
          <Button
            variant={paymentFilters.status === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPaymentFilters({ ...paymentFilters, status: 'all' })}
            className="h-8"
          >
            All Payments
          </Button>
          <Button
            variant={paymentFilters.status === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPaymentFilters({ ...paymentFilters, status: 'completed' })}
            className="h-8"
          >
            Received Only
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          {payments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {propertyPaymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : !propertyPaymentsData?.payments || propertyPaymentsData.payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded for this property yet
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {payment.unit_id ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {payment.unit_name || payment.unit_number || '1'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{payment.tenant_name}</TableCell>
                        <TableCell className="font-medium">
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {payment.payment_type === 'tenant_rent' ? (
                            <Badge className="bg-blue-500 hover:bg-blue-600">Tenant Rent</Badge>
                          ) : (
                            <Badge className="bg-green-500 hover:bg-green-600">HAP Voucher</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{payment.payment_source}</span>
                            {payment.is_plaid_matched && (
                              <Badge variant="success" className="text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Auto-matched
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              payment.status === 'completed' ? 'success' : 
                              payment.status === 'pending' ? 'warning' : 
                              payment.status === 'failed' ? 'danger' : 
                              'neutral'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment.reference_number}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length} payments
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
