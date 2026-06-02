import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Search, DollarSign, TrendingUp, Clock, PieChart, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAllIncomingPayments, useAllIncomingPaymentStats } from '@/hooks/useAllIncomingPayments';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { ManualPaymentDialog } from './ManualPaymentDialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface AllIncomingPaymentsTableProps {
  landlordId: string;
  portfolioId?: string;
}

type Payment = {
  id: string;
  payment_date: string;
  property_address: string;
  unit_id?: string;
  unit_number?: string;
  unit_name?: string;
  tenant_name: string;
  amount: number;
  payment_type: 'tenant_rent' | 'hap_voucher';
  payment_source: string;
  status: string;
  reference_number: string;
};

export const AllIncomingPaymentsTable = ({ landlordId, portfolioId }: AllIncomingPaymentsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentType, setPaymentType] = useState('all');
  const [status, setStatus] = useState('all');
  const [propertyId, setPropertyId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const filters = {
    searchTerm,
    paymentType: paymentType === 'all' ? undefined : paymentType,
    status: status === 'all' ? undefined : status,
    propertyId: propertyId === 'all' ? undefined : propertyId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  };

  const { data, isLoading } = useAllIncomingPayments(landlordId, portfolioId, filters);
  const { data: stats, isLoading: statsLoading } = useAllIncomingPaymentStats(landlordId, portfolioId);

  const payments = data?.payments || [];
  const count = data?.count || 0;

  const totalPages = Math.ceil(count / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, count);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, paymentType, status, propertyId, dateFrom, dateTo]);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const getStatusBadge = (status: string, paymentType: string) => {
    // HAP payments should never show "late" status
    if (paymentType === 'hap_voucher' && status === 'Late') {
      return <Badge variant="secondary">Delayed</Badge>;
    }

    // Map new computed statuses to badge variants
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
      'Received': { variant: 'default', label: 'Received' },
      'Late': { variant: 'destructive', label: 'Late' },
      'Received/Late': { variant: 'outline', label: 'Received/Late', className: 'border-orange-500 text-orange-600 bg-orange-50' },
      // Legacy status mappings for compatibility
      completed: { variant: 'default', label: 'Received' },
      paid: { variant: 'default', label: 'Received' },
      received: { variant: 'default', label: 'Received' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Late' },
      late: { variant: 'destructive', label: 'Late' },
      partial: { variant: 'secondary', label: 'Partial' },
      overdue: { variant: 'destructive', label: 'Late' },
    };

    const statusInfo = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getPaymentTypeBadge = (type: 'tenant_rent' | 'hap_voucher') => {
    if (type === 'tenant_rent') {
      return <Badge className="bg-blue-500 text-white">Tenant Rent</Badge>;
    }
    return <Badge className="bg-green-500 text-white">HAP Voucher</Badge>;
  };

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.payment_date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'property_address',
      header: 'Property',
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => {
        if (!row.original.unit_id) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {row.original.unit_name || row.original.unit_number || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
    },
    {
      accessorKey: 'payment_type',
      header: 'Type',
      cell: ({ row }) => getPaymentTypeBadge(row.original.payment_type),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => `$${row.original.amount.toLocaleString()}`,
    },
    {
      accessorKey: 'payment_source',
      header: 'Source',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status, row.original.payment_type),
    },
    {
      accessorKey: 'reference_number',
      header: 'Reference #',
    },
  ];

  const handleExport = () => {
    const csv = [
      ['Date', 'Property', 'Tenant', 'Type', 'Amount', 'Source', 'Status', 'Reference #'].join(','),
      ...payments.map((p: Payment) => [
        format(new Date(p.payment_date), 'yyyy-MM-dd'),
        p.property_address,
        p.tenant_name,
        p.payment_type === 'tenant_rent' ? 'Tenant Rent' : 'HAP Voucher',
        p.amount,
        p.payment_source,
        p.status,
        p.reference_number,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incoming-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const tenantPercentage = stats?.totalReceived > 0 
    ? Math.round((stats.totalTenantRent / stats.totalReceived) * 100)
    : 0;
  const hapPercentage = 100 - tenantPercentage;

  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Showing {count > 0 ? startIndex + 1 : 0}-{endIndex} of {count} payments
        </span>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {getPageNumbers().map((page, idx) => (
              <PaginationItem key={idx}>
                {page === '...' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => setCurrentPage(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold">
                ${statsLoading ? '...' : (stats?.totalReceived || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                ${statsLoading ? '...' : (stats?.totalReceivedThisMonth || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.pendingCount || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <PieChart className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Split</p>
              <p className="text-lg font-bold">
                {statsLoading ? '...' : `${tenantPercentage}% / ${hapPercentage}%`}
              </p>
              <p className="text-xs text-muted-foreground">Tenant / HAP</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Incoming Payments</h3>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setIsManualPaymentOpen(true)} size="sm" data-tour="record-payment-btn">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rent">Tenant Rent Only</SelectItem>
                <SelectItem value="hap">HAP Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed/Received</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed/Late</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPaymentType('all');
                setStatus('all');
                setPropertyId('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No payments found</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <PaginationControls />
            </div>
            <DataTable columns={columns} data={payments} />
            <div className="mt-4">
              <PaginationControls />
            </div>
          </>
        )}
      </Card>

      <ManualPaymentDialog
        open={isManualPaymentOpen}
        onOpenChange={setIsManualPaymentOpen}
        landlordId={landlordId}
        portfolioId={portfolioId}
      />
    </div>
  );
};
