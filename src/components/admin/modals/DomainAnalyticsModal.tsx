import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, TrendingDown, Clock, RefreshCw } from 'lucide-react';
import { type DomainInfo } from '@/hooks/useWhiteLabelDomains';
import { useWhiteLabelAnalytics } from '@/hooks/useWhiteLabelAnalytics';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { formatLastChecked } from '@/utils/domainHelpers';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DomainAnalyticsModalProps {
  domain: DomainInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const DomainAnalyticsModal: React.FC<DomainAnalyticsModalProps> = ({
  domain,
  isOpen,
  onClose,
}) => {
  // Memoize date range to prevent query from restarting on every render
  const dateRange = useMemo(() => ({
    start: subDays(new Date(), 30),
    end: new Date(),
  }), []);

  const { data: allAnalytics, isLoading, isError, error, refetch, isFetching } = useWhiteLabelAnalytics(dateRange);

  // Find analytics for this specific domain
  const analytics = allAnalytics?.find(a => a.config_id === domain.id);

  const hasData = analytics && analytics.page_views > 0;
  
  // Prioritize showing content if data exists, even during refetch
  const showLoading = isLoading && !allAnalytics;
  const showError = isError && !allAnalytics;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-3 pr-24">
            <Activity className="h-5 w-5" />
            Analytics Dashboard
          </DialogTitle>
          <div className="absolute top-0 right-12 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {domain.company_name} • Last 30 Days
          </div>
        </DialogHeader>

        {showError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Activity className="h-12 w-12 text-destructive opacity-20" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Failed to Load Analytics</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error?.message || 'Unable to fetch analytics data. Please try again.'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : showLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Activity className="h-12 w-12 text-muted-foreground opacity-20" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">No Analytics Data Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This domain hasn't received any tracked visits yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Page Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.page_views.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Unique Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.unique_visitors.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Unique sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    Bounce Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.bounce_rate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Single page visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Avg Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.avg_session_duration > 0 
                      ? `${Math.round(analytics.avg_session_duration)}s`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per session</p>
                </CardContent>
              </Card>
            </div>

            {/* Domain Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Domain Status</span>
                  <Badge variant={domain.domain_verification_status === 'verified' ? 'default' : 'secondary'}>
                    {domain.domain_verification_status === 'verified' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Verification Status</span>
                  <Badge 
                    variant={
                      domain.domain_verification_status === 'verified' ? 'default' :
                      domain.domain_verification_status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {domain.domain_verification_status || 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Checked</span>
                  <span className="text-sm font-medium">{formatLastChecked(domain.last_checked_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Pages */}
            {analytics.top_pages && analytics.top_pages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page Path</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.top_pages.slice(0, 5).map((page, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{page.path}</TableCell>
                          <TableCell className="text-right font-medium">{page.views.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Event Breakdown */}
            {analytics.event_counts && Object.keys(analytics.event_counts).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.event_counts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([event, count]) => (
                        <div key={event} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span className="text-sm font-medium capitalize">{event.replace('_', ' ')}</span>
                          <Badge variant="outline">{count.toLocaleString()}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
