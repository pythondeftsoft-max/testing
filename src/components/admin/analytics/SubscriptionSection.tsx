import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Users, Layers, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SubscriptionSectionProps {
  metrics: ComprehensiveMetrics;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const SubscriptionSection = ({ metrics }: SubscriptionSectionProps) => {
  const autopayRate = metrics.subscriptions.active > 0
    ? ((metrics.subscriptions.autopay_enabled_count / metrics.subscriptions.active) * 100).toFixed(1)
    : '0';

  const statusData = Object.entries(metrics.subscriptions.by_status || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const planTypeData = Object.entries(metrics.subscriptions.by_plan_type || {}).map(([plan, count]) => ({
    name: plan.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: count,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Subscription Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subscription Overview</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold">{metrics.subscriptions.total}</p>
              <p className="text-xs text-muted-foreground">Total Subscriptions</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active</span>
              <span className="text-sm font-semibold text-green-600">{metrics.subscriptions.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Inactive</span>
              <span className="text-sm font-semibold text-orange-600">
                {metrics.subscriptions.total - metrics.subscriptions.active}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units & Autopay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Units & Autopay</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold">{metrics.subscriptions.total_units}</p>
              <p className="text-xs text-muted-foreground">Total Units Managed</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Autopay Enabled</span>
              <span className="text-sm font-semibold text-blue-600">
                {metrics.subscriptions.autopay_enabled_count}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Adoption Rate</span>
              </div>
              <span className="text-sm font-semibold">{autopayRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Type Distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {planTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={planTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {planTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              No plan data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.subscriptions.by_status || {}).map(([status, count]) => (
              <div key={status} className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground capitalize">
                  {status.replace('_', ' ')}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
