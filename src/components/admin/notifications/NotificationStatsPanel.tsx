import { Card } from '@/components/ui/card';
import { NotificationTypeStats } from '@/hooks/useNotificationTypeAnalytics';
import { Bell, CheckCircle2, XCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface NotificationStatsPanelProps {
  stats: NotificationTypeStats[];
  userType: 'tenant' | 'landlord';
}

export const NotificationStatsPanel = ({ stats, userType }: NotificationStatsPanelProps) => {
  const totalTypes = stats.length;
  const activeTypes = stats.filter(s => s.status === 'active').length;
  const neverSentTypes = stats.filter(s => s.status === 'never_sent').length;
  const withLinks = stats.filter(s => s.linkStatus === 'valid').length;
  const withoutLinks = stats.filter(s => s.linkStatus === 'missing').length;
  const totalSent = stats.reduce((sum, s) => sum + s.total_count, 0);
  const last24h = stats.reduce((sum, s) => sum + s.last_24h, 0);
  
  // Get top 3 types by last 24h activity
  const topActive = [...stats]
    .filter(s => s.last_24h > 0)
    .sort((a, b) => b.last_24h - a.last_24h)
    .slice(0, 3);

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Defined</p>
              <p className="text-2xl font-bold">{totalTypes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Types</p>
              <p className="text-2xl font-bold">{activeTypes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Never Sent</p>
              <p className="text-2xl font-bold">{neverSentTypes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">With Links</p>
              <p className="text-2xl font-bold">{withLinks}/{totalTypes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Missing Links</p>
              <p className="text-2xl font-bold">{withoutLinks}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Most Active (Last 24h)</h3>
          </div>
          {topActive.length > 0 ? (
            <div className="space-y-2">
              {topActive.map((stat, index) => (
                <div key={stat.type} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium text-sm">{stat.type}</span>
                    {stat.category && (
                      <span className="text-xs text-muted-foreground">({stat.category})</span>
                    )}
                  </div>
                  <span className="font-bold">{stat.last_24h}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notifications sent in the last 24 hours</p>
          )}
        </div>
      </Card>
    </div>
  );
};
