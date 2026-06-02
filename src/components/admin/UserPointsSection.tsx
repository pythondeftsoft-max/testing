
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

interface UserPointsSectionProps {
  userId: string;
}

const UserPointsSection = ({ userId }: UserPointsSectionProps) => {
  const { userPoints, pointsSummary, loading, error } = useUserPoints(userId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <MetricSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading points data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsSummary?.total_points || 0}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsSummary?.points_this_month || 0}</div>
            <p className="text-xs text-muted-foreground">
              Current month earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsSummary?.points_last_month || 0}</div>
            <p className="text-xs text-muted-foreground">
              Previous month earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsSummary?.portfolio_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active portfolios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Points History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Points Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPoints && userPoints.length > 0 ? (
              userPoints.slice(0, 10).map((point) => (
                <div key={point.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{point.source_event_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(point.created_at).toLocaleDateString()}
                    </p>
                    {point.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{point.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{point.points_awarded}</p>
                    <p className="text-xs text-muted-foreground">
                      {point.distribution_percent}% distributed
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No points activity found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserPointsSection;
