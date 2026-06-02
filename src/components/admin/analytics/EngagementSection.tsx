import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { MessageSquare, Users, FileText, Gift, Award } from 'lucide-react';

interface EngagementSectionProps {
  metrics: ComprehensiveMetrics;
}

export const EngagementSection = ({ metrics }: EngagementSectionProps) => {
  const applicationStatusData = Object.entries(metrics.applications.by_status || {});
  const referralStatusData = Object.entries(metrics.referrals.by_status || {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Messages</span>
            <span className="text-2xl font-bold">{metrics.messages.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Month</span>
            <span className="font-semibold text-primary">{metrics.messages.this_month}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg per User</span>
            <span className="font-semibold">
              {Math.round(metrics.messages.total / Math.max(metrics.users.total, 1))}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">{metrics.applications.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Month</span>
            <span className="font-semibold text-primary">{metrics.applications.this_month}</span>
          </div>
          {applicationStatusData.length > 0 && (
            <div className="pt-2 border-t space-y-1">
              {applicationStatusData.map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className="capitalize">{status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">{metrics.referrals.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conversion</span>
            <span className="font-semibold text-green-600">{metrics.referrals.conversion_rate}%</span>
          </div>
          {referralStatusData.length > 0 && (
            <div className="pt-2 border-t space-y-1">
              {referralStatusData.map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className="capitalize">{status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Points System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Distributed</span>
            <span className="text-2xl font-bold">{metrics.points.total_distributed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Users</span>
            <span className="font-semibold">{metrics.points.active_users}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Month</span>
            <span className="font-semibold text-primary">{metrics.points.this_month}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
