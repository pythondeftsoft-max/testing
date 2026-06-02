
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, TrendingUp, Users, Calendar } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';

interface PortfolioPointsDashboardWidgetProps {
  portfolioId: string;
  onViewDetails?: () => void;
}

const PortfolioPointsDashboardWidget = ({ 
  portfolioId, 
  onViewDetails 
}: PortfolioPointsDashboardWidgetProps) => {
  const { pointsSummary, loading } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Portfolio Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPoints = pointsSummary?.total_points || 0;
  const thisMonth = pointsSummary?.points_this_month || 0;
  const lastMonth = pointsSummary?.points_last_month || 0;
  const monthlyChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Portfolio Points
          </CardTitle>
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{totalPoints.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">Total Points</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-sm font-medium">This Month</span>
            </div>
            <div className="text-xl font-bold text-blue-600">{thisMonth}</div>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm font-medium">Growth</span>
            </div>
            <div className="flex items-center justify-center">
              <span className={`text-xl font-bold ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {pointsSummary?.top_source_event && (
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm text-muted-foreground">Top Activity:</span>
            <Badge variant="outline">
              {pointsSummary.top_source_event.replace('_', ' ')}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioPointsDashboardWidget;
