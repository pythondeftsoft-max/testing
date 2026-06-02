import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy,
  TrendingUp,
  Target,
  TrendingDown,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { useWorkerActivityTimeline } from '@/hooks/useWorkerActivityTimeline';
import { useWorkerPerformanceKPIs } from '@/hooks/useWorkerPerformance';
import { WorkerPerformanceKPICard } from './WorkerPerformanceKPICard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface WorkerDetailDrawerProps {
  workerId: string;
  dateRange: { from: Date; to: Date };
  onClose: () => void;
}

export const WorkerDetailDrawer: React.FC<WorkerDetailDrawerProps> = ({
  workerId,
  dateRange,
  onClose,
}) => {
  const { data: activities, isLoading } = useWorkerActivityTimeline(workerId, dateRange);
  const { data: kpis } = useWorkerPerformanceKPIs({ dateRange, workerId });

  // Get worker name from first activity
  const workerName = activities?.[0]?.entity_name || 'Worker';

  return (
    <Sheet open={!!workerId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Worker Performance Details
          </SheetTitle>
          <SheetDescription>
            Detailed activity and metrics for selected worker
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Worker Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Worker ID:</span>
                  <p className="font-mono text-xs">{workerId}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Points:</span>
                  <p className="text-2xl font-bold text-yellow-600">{kpis?.totalPoints || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Lease Signed</p>
                  <p className="text-xl font-bold">{kpis?.leaseSignedMoves || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Paid/Housed</p>
                  <p className="text-xl font-bold">{kpis?.paidHousedMoves || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Backwards</p>
                  <p className="text-xl font-bold text-red-600">{kpis?.backwardsMoves || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-xl font-bold">{kpis?.conversionRate || 0}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !activities || activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity in selected date range
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="mt-1">
                        {activity.is_forward_move ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={activity.entity_type === 'tenant' ? 'default' : 'secondary'}>
                            {activity.entity_type}
                          </Badge>
                          <span className="text-sm font-medium">{activity.entity_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {activity.from_stage && (
                            <>
                              <span>{activity.from_stage}</span>
                              <span>→</span>
                            </>
                          )}
                          <span className="font-medium">{activity.to_stage}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-semibold ${
                            activity.points_earned > 0
                              ? 'text-green-600'
                              : activity.points_earned < 0
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {activity.points_earned > 0 ? '+' : ''}
                          {activity.points_earned}
                        </span>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
