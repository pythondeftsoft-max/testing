import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageSquare, CheckCircle2, TrendingUp } from 'lucide-react';
import { useMatchmakerStats } from '@/hooks/useMatchmakerStats';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}

const MetricCard = ({ title, value, icon: Icon, colorClass }: MetricCardProps) => (
  <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg border border-border">
    <div className={`p-3 rounded-full ${colorClass}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export const AdminMatchmakerStats = () => {
  const { data: stats, isLoading, error } = useMatchmakerStats();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤝 Matchmaker Stats
          </CardTitle>
          <CardDescription>Unable to load matchmaker statistics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤝 Matchmaker Stats
          </CardTitle>
          <CardDescription>
            Track tenant-landlord matching pipeline and placement success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🤝 Matchmaker Stats
        </CardTitle>
        <CardDescription>
          Track tenant-landlord matching pipeline and placement success
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pending Applications"
            value={stats?.pendingApplications || 0}
            icon={Clock}
            colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
          />
          <MetricCard
            title="In Conversation"
            value={stats?.activeConversations || 0}
            icon={MessageSquare}
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
          <MetricCard
            title="Approved This Month"
            value={stats?.monthlyApproved || 0}
            icon={CheckCircle2}
            colorClass="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
          />
          <MetricCard
            title="Placement Rate"
            value={`${stats?.placementRate || 0}%`}
            icon={TrendingUp}
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
          />
        </div>
      </CardContent>
    </Card>
  );
};
