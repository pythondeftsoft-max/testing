import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, CalendarCheck } from 'lucide-react';
import type { MyPerformance } from '@/hooks/useInspectorMyWork';

interface Props {
  performance: MyPerformance;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; tone?: 'default' | 'success' | 'warning' }> = ({ label, value, icon, tone = 'default' }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone === 'success' ? 'bg-success/10 text-success' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const InspectorPerformance: React.FC<Props> = ({ performance }) => {
  const passTone = performance.pass_rate >= 80 ? 'success' : performance.pass_rate >= 60 ? 'warning' : 'default';
  const onTimeTone = performance.on_time_pct >= 80 ? 'success' : performance.on_time_pct >= 60 ? 'warning' : 'default';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Completed (lifetime)" value={performance.total_completed} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Completed this month" value={performance.completed_this_month} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="Pass rate" value={`${performance.pass_rate}%`} icon={<TrendingUp className="h-5 w-5" />} tone={passTone} />
        <StatCard label="On-time %" value={`${performance.on_time_pct}%`} icon={<Clock className="h-5 w-5" />} tone={onTimeTone} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Scheduled" value={performance.scheduled} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="In progress" value={performance.in_progress} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Avg days to complete" value={`${performance.avg_days_to_complete}d`} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Overdue" value={performance.overdue} icon={<AlertTriangle className="h-5 w-5" />} tone={performance.overdue > 0 ? 'warning' : 'default'} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Performance notes</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>These are your read-only stats. Supervisors and admins see the same numbers in Inspection Oversight.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant={passTone === 'success' ? 'success' : passTone === 'warning' ? 'warning' : 'secondary'}>Pass rate {performance.pass_rate}%</Badge>
            <Badge variant={onTimeTone === 'success' ? 'success' : onTimeTone === 'warning' ? 'warning' : 'secondary'}>On-time {performance.on_time_pct}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectorPerformance;
