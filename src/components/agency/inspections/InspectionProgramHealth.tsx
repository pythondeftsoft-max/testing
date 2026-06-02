import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProgramHealthMetrics } from '@/hooks/useInspectionOversight';

interface Props {
  health: ProgramHealthMetrics | null;
  loading: boolean;
}

const KpiCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; tone?: string }> = ({ label, value, icon, tone }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${tone || ''}`}>{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const InspectionProgramHealth: React.FC<Props> = ({ health, loading }) => {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!health) return <div className="text-center py-12 text-muted-foreground text-sm">No data yet.</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Completed (Month)" value={health.total_month} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Pass Rate" value={`${health.pass_rate}%`} icon={<TrendingUp className="h-5 w-5" />} tone={health.pass_rate >= 80 ? 'text-success' : 'text-warning'} />
        <KpiCard label="Avg Days to Complete" value={health.avg_days} icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Overdue" value={`${health.overdue_pct}%`} icon={<AlertTriangle className="h-5 w-5" />} tone={health.overdue_pct > 10 ? 'text-destructive' : ''} />
        <KpiCard label="Re-inspection Rate" value={`${health.reinspection_rate}%`} icon={<RefreshCw className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspections — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={health.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" name="Completed" />
              <Line type="monotone" dataKey="passed" stroke="hsl(var(--success))" name="Passed" />
              <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg Deficiencies / Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={health.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_def" fill="hsl(var(--primary))" name="Avg Deficiencies" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top NSPIRE Codes Cited</CardTitle>
          </CardHeader>
          <CardContent>
            {health.top_codes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No NSPIRE codes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {health.top_codes.map(c => (
                  <div key={c.code} className="flex items-center justify-between p-2 rounded bg-muted/40">
                    <span className="font-mono text-sm">{c.code}</span>
                    <Badge variant="secondary">{c.count} cite{c.count > 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InspectionProgramHealth;
