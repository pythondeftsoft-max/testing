
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { format } from 'date-fns';

interface RecentActivitySummaryProps {
  portfolioId: string;
}

const RecentActivitySummary = ({ portfolioId }: RecentActivitySummaryProps) => {
  const { portfolioPoints, loading } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const recentActivity = portfolioPoints?.slice(0, 5) || [];

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="border-l-2 border-gray-200 pl-3 py-1">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.source_event_type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs font-medium text-green-600">
                    +{activity.points_awarded}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivitySummary;
