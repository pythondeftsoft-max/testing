import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { Wrench, Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MaintenanceSectionProps {
  metrics: ComprehensiveMetrics;
}

export const MaintenanceSection = ({ metrics }: MaintenanceSectionProps) => {
  const statusData = Object.entries(metrics.maintenance.by_status || {});
  const priorityData = Object.entries(metrics.maintenance.by_priority || {});

  const completedCount = statusData.find(([status]) => status === 'completed')?.[1] || 0;
  const completionRate = metrics.maintenance.total > 0 
    ? Math.round((completedCount / metrics.maintenance.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <span className="text-2xl font-bold">{metrics.maintenance.total}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
          {metrics.maintenance.avg_completion_days && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Avg completion:</span>
              <span className="font-semibold">{Math.round(metrics.maintenance.avg_completion_days)} days</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusData.length > 0 ? (
            statusData.map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No status data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Priority Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {priorityData.length > 0 ? (
            priorityData.map(([priority, count]) => {
              const color = priority === 'high' 
                ? 'text-red-600' 
                : priority === 'medium' 
                ? 'text-yellow-600' 
                : 'text-green-600';
              
              return (
                <div key={priority} className="flex justify-between items-center">
                  <span className={`text-sm capitalize ${color}`}>{priority}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No priority data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
