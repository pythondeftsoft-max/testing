import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface FinancialSectionProps {
  metrics: ComprehensiveMetrics;
}

export const FinancialSection = ({ metrics }: FinancialSectionProps) => {
  const pieData = [
    { name: 'Collected', value: metrics.financial.total_collected, color: 'hsl(var(--primary))' },
    { name: 'Pending', value: metrics.financial.total_pending, color: 'hsl(var(--secondary))' },
    { name: 'Late', value: metrics.financial.total_late, color: 'hsl(var(--destructive))' }
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No financial data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collection Rate</span>
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${metrics.financial.collection_rate > 70 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="font-semibold">{metrics.financial.collection_rate}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Payments</span>
            <span className="font-semibold">{metrics.financial.payment_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collected</span>
            <span className="font-semibold text-green-600">${metrics.financial.total_collected.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending</span>
            <span className="font-semibold text-secondary">${metrics.financial.total_pending.toLocaleString()}</span>
          </div>
          {metrics.financial.total_late > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Late
              </span>
              <span className="font-semibold text-destructive">${metrics.financial.total_late.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Revenue</span>
            <span className="font-semibold text-xl">
              ${(metrics.financial.total_collected + metrics.financial.total_pending).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg per Property</span>
            <span className="font-semibold">
              ${Math.round((metrics.financial.total_collected + metrics.financial.total_pending) / Math.max(metrics.properties.total, 1)).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Payers</span>
            <span className="font-semibold">{metrics.financial.payment_count}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
