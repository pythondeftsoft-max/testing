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
import { Search, Download, TrendingUp, TrendingDown, Eye, Calendar } from 'lucide-react';
import { useAdminPointsRecentActivity } from '@/hooks/useAdminPointsAnalytics';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { format } from 'date-fns';

const PointsLogsTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch points activity with higher limit
  const { data: pointsActivity, isLoading } = useAdminPointsRecentActivity(500);

  // Filter and search logic
  const filteredActivities = React.useMemo(() => {
    if (!pointsActivity) return [];

    return pointsActivity.filter((activity) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        activity.user_name?.toLowerCase().includes(searchLower) ||
        activity.user_email?.toLowerCase().includes(searchLower) ||
        activity.event_type?.toLowerCase().includes(searchLower);

      // Date filter
      const activityDate = new Date(activity.created_at);
      const now = new Date();
      let matchesDate = true;

      if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = activityDate >= sevenDaysAgo;
      } else if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = activityDate >= thirtyDaysAgo;
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchesDate = activityDate >= ninetyDaysAgo;
      }

      // Event type filter
      const matchesEventType =
        eventTypeFilter === 'all' || activity.event_type === eventTypeFilter;

      return matchesSearch && matchesDate && matchesEventType;
    });
  }, [pointsActivity, searchQuery, dateFilter, eventTypeFilter]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (!filteredActivities.length) {
      return { totalTransactions: 0, totalPoints: 0, positivePoints: 0, negativePoints: 0 };
    }

    const stats = filteredActivities.reduce(
      (acc, activity) => {
        acc.totalTransactions += 1;
        acc.totalPoints += activity.points_change;
        if (activity.points_change > 0) {
          acc.positivePoints += activity.points_change;
        } else {
          acc.negativePoints += Math.abs(activity.points_change);
        }
        return acc;
      },
      { totalTransactions: 0, totalPoints: 0, positivePoints: 0, negativePoints: 0 }
    );

    return stats;
  }, [filteredActivities]);

  // Pagination logic
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredActivities.length) return;

    const headers = ['User Name', 'User Email', 'Event Type', 'Points Change', 'Balance After', 'Notes', 'Date'];
    const csvData = filteredActivities.map((activity) => [
      activity.user_name,
      activity.user_email,
      activity.event_type,
      activity.points_change,
      activity.points_balance_after,
      activity.notes || '',
      format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `points-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get unique event types for filter
  const eventTypes = React.useMemo(() => {
    if (!pointsActivity) return [];
    const types = new Set(pointsActivity.map((a) => a.event_type));
    return Array.from(types).sort();
  }, [pointsActivity]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total points change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{summaryStats.positivePoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Positive transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Deducted</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{summaryStats.negativePoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Negative transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Points Transaction Logs</CardTitle>
              <CardDescription>Complete history of all points transactions</CardDescription>
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
                  placeholder="Search by user name, email, or event type..."
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

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
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
          ) : paginatedActivities.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead className="text-right">Points Change</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.user_name}</div>
                            <div className="text-sm text-muted-foreground">{activity.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.event_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={activity.points_change > 0 ? 'default' : 'destructive'}
                            className={
                              activity.points_change > 0
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : ''
                            }
                          >
                            {activity.points_change > 0 ? '+' : ''}
                            {activity.points_change.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-foreground">
                            {activity.points_balance_after.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {activity.notes || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
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
                {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of{' '}
                {filteredActivities.length} transactions
              </p>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PointsLogsTab;
