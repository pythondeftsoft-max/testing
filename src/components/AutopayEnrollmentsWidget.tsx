import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useAutopaySchedules } from '@/hooks/useAutopaySchedules';
import { Calendar, Users, ExternalLink } from 'lucide-react';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

interface AutopayEnrollmentsWidgetProps {
  portfolioId?: string;
}

export const AutopayEnrollmentsWidget: React.FC<AutopayEnrollmentsWidgetProps> = ({
  portfolioId
}) => {
  const navigate = useNavigate();
  const { data: schedules, isLoading, error } = useAutopaySchedules(portfolioId);

  const getStatusBadge = (status: string, failureCount: number) => {
    if (status === 'active' && failureCount === 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    }
    if (status === 'active' && failureCount > 0) {
      return <Badge variant="destructive">Issues</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  const formatNextPayment = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Overdue';
    return `${diffDays} days`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Autopay Enrollments</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Autopay Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load autopay data</p>
        </CardContent>
      </Card>
    );
  }

  const activeSchedules = schedules?.filter(s => s.status === 'active') || [];
  const totalEnrolled = activeSchedules.length;
  const totalMonthlyAmount = activeSchedules.reduce((sum, schedule) => sum + schedule.amount, 0);
  const issueSchedules = activeSchedules.filter(s => s.failure_count > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Autopay Enrollments</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">Active Tenants</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              <CurrencyDisplay 
                amount={totalMonthlyAmount}
                variant="compact"
                className="text-2xl font-bold"
              />
            </div>
            <p className="text-xs text-muted-foreground">Monthly Total</p>
          </div>
        </div>

        {/* Issue Alert */}
        {issueSchedules.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              {issueSchedules.length} enrollment{issueSchedules.length > 1 ? 's' : ''} with payment issues
            </p>
          </div>
        )}

        {/* Recent Enrollments */}
        {activeSchedules.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Recent Enrollments</h4>
            {activeSchedules.slice(0, 3).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {schedule.asset?.asset_name || 'Asset'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{schedule.tenant?.first_name} {schedule.tenant?.last_name}</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    <span>Day {schedule.autopay_day}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CurrencyDisplay 
                    amount={schedule.amount}
                    variant="compact"
                    className="text-xs"
                  />
                  {getStatusBadge(schedule.status, schedule.failure_count)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No autopay enrollments yet</p>
          </div>
        )}

        {/* View All Button */}
        <div className="pt-2 border-t">
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/landlord/payments')}
            >
              View All Payments
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/landlord/autopay${portfolioId ? `?portfolioId=${portfolioId}` : ''}`)}
            >
              Manage Autopay
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};