
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Award, Activity, Calendar, Target } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';

interface PortfolioPointsSummaryProps {
  portfolioId: string;
}

const PortfolioPointsSummary = ({ portfolioId }: PortfolioPointsSummaryProps) => {
  const { pointsSummary, loading, error } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !pointsSummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">Error loading points summary</div>
        </CardContent>
      </Card>
    );
  }

  const monthlyChange = pointsSummary.points_last_month > 0 
    ? ((pointsSummary.points_this_month - pointsSummary.points_last_month) / pointsSummary.points_last_month) * 100
    : pointsSummary.points_this_month > 0 ? 100 : 0;

  const formatEventType = (eventType: string) => {
    if (eventType === 'none') return 'No activity yet';
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Points */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pointsSummary.total_points.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Lifetime portfolio earnings
          </p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pointsSummary.points_this_month.toLocaleString()}</div>
          <div className="flex items-center text-xs">
            {monthlyChange > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : monthlyChange < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : null}
            <span className={monthlyChange > 0 ? 'text-green-500' : monthlyChange < 0 ? 'text-red-500' : 'text-muted-foreground'}>
              {monthlyChange !== 0 ? `${Math.abs(monthlyChange).toFixed(1)}% from last month` : 'No change from last month'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pointsSummary.recent_activity_count}</div>
          <p className="text-xs text-muted-foreground">
            Point events in last 7 days
          </p>
        </CardContent>
      </Card>

      {/* Top Source */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Source</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium mb-1">
            {formatEventType(pointsSummary.top_source_event)}
          </div>
          <p className="text-xs text-muted-foreground">
            Highest earning activity
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioPointsSummary;
