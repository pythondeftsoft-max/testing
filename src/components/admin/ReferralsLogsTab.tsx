import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Download, Users, CheckCircle, Clock, XCircle, Gift, Mail, Home, DollarSign } from 'lucide-react';
import { useAdminReferralsRecentActivity } from '@/hooks/useAdminReferralsAnalytics';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { format } from 'date-fns';

const ReferralsLogsTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch referrals activity with higher limit
  const { data: referralsActivity, isLoading } = useAdminReferralsRecentActivity(500);

  // Filter and search logic
  const filteredReferrals = React.useMemo(() => {
    if (!referralsActivity) return [];

    return referralsActivity.filter((referral) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        referral.referrer_name?.toLowerCase().includes(searchLower) ||
        referral.referred_name?.toLowerCase().includes(searchLower) ||
        referral.referred_email?.toLowerCase().includes(searchLower) ||
        referral.referral_id?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;

      // Date filter
      const referralDate = new Date(referral.updated_at);
      const now = new Date();
      let matchesDate = true;

      if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = referralDate >= sevenDaysAgo;
      } else if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = referralDate >= thirtyDaysAgo;
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchesDate = referralDate >= ninetyDaysAgo;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [referralsActivity, searchQuery, statusFilter, dateFilter]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (!filteredReferrals.length) {
      return {
        totalReferrals: 0,
        invitation_sent: 0,
        registered: 0,
        approved: 0,
        first_payment: 0,
        qualified: 0,
        expired: 0,
      };
    }

    const stats = filteredReferrals.reduce(
      (acc, referral) => {
        acc.totalReferrals += 1;
        if (referral.status === 'invitation_sent') acc.invitation_sent += 1;
        else if (referral.status === 'registered') acc.registered += 1;
        else if (referral.status === 'approved') acc.approved += 1;
        else if (referral.status === 'first_payment') acc.first_payment += 1;
        else if (referral.status === 'qualified') acc.qualified += 1;
        else if (referral.status === 'expired') acc.expired += 1;
        return acc;
      },
      { totalReferrals: 0, invitation_sent: 0, registered: 0, approved: 0, first_payment: 0, qualified: 0, expired: 0 }
    );

    return stats;
  }, [filteredReferrals]);

  // Pagination logic
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredReferrals.length) return;

    const headers = ['Referral ID', 'Referrer Name', 'Referred User Name', 'Referred Email', 'Status', 'Updated At'];
    const csvData = filteredReferrals.map((referral) => [
      referral.referral_id,
      referral.referrer_name,
      referral.referred_name,
      referral.referred_email,
      referral.status,
      format(new Date(referral.updated_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'invitation_sent':
        return { variant: 'secondary' as const, icon: Mail, className: 'bg-blue-100 text-blue-800' };
      case 'registered':
        return { variant: 'secondary' as const, icon: Users, className: 'bg-indigo-100 text-indigo-800' };
      case 'approved':
        return { variant: 'secondary' as const, icon: Home, className: 'bg-purple-100 text-purple-800' };
      case 'first_payment':
        return { variant: 'secondary' as const, icon: DollarSign, className: 'bg-teal-100 text-teal-800' };
      case 'qualified':
        return { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800' };
      case 'expired':
        return { variant: 'destructive' as const, icon: XCircle, className: '' };
      default:
        return { variant: 'outline' as const, icon: Clock, className: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalReferrals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitations</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.invitation_sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Links sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{summaryStats.registered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Signed up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Home className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.approved.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Apps approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{summaryStats.first_payment.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Paid rent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.qualified.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">60-day milestone</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.expired.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Did not qualify</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referral Activity Logs</CardTitle>
              <CardDescription>Complete history of all referral activities</CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by referrer, referred user, or referral ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="invitation_sent">Invitation Sent</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="first_payment">First Payment</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <MetricSkeleton />
                </div>
              ))}
            </div>
          ) : paginatedReferrals.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referral ID</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReferrals.map((referral) => {
                      const statusBadge = getStatusBadge(referral.status);
                      const StatusIcon = statusBadge.icon;
                      
                      return (
                        <TableRow key={referral.referral_id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {referral.referral_id.slice(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{referral.referrer_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="font-medium">{referral.referred_name}</div>
                              <div className="text-xs text-muted-foreground">{referral.referred_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant} className={statusBadge.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {referral.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(referral.updated_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && <PaginationEllipsis />}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}

              <p className="text-sm text-muted-foreground text-center">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredReferrals.length)} of{' '}
                {filteredReferrals.length} referrals
              </p>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No referrals found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralsLogsTab;
