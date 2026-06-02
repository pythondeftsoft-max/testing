import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, UserCheck, Users } from 'lucide-react';

interface RetentionRateTimelineProps {
  data?: Array<{
    period: string;
    retentionRate: number;
    renewals: number;
    totalTenants: number;
  }>;
}

export const RetentionRateTimeline: React.FC<RetentionRateTimelineProps> = ({ data }) => {
  // Mock data if none provided
  const chartData = data || [
    { period: 'Q1 2023', retentionRate: 78, renewals: 23, totalTenants: 30 },
    { period: 'Q2 2023', retentionRate: 82, renewals: 27, totalTenants: 33 },
    { period: 'Q3 2023', retentionRate: 85, renewals: 29, totalTenants: 34 },
    { period: 'Q4 2023', retentionRate: 87, renewals: 31, totalTenants: 36 },
    { period: 'Q1 2024', retentionRate: 89, renewals: 34, totalTenants: 38 },
    { period: 'Q2 2024', retentionRate: 91, renewals: 36, totalTenants: 40 }
  ];

  const currentRate = chartData[chartData.length - 1]?.retentionRate || 0;
  const previousRate = chartData[chartData.length - 2]?.retentionRate || 0;
  const trend = currentRate - previousRate;
  const averageRate = chartData.reduce((sum, item) => sum + item.retentionRate, 0) / chartData.length;

  const getRetentionColor = (rate: number) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 80) return 'text-primary';
    if (rate >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getRetentionStatus = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Good';
    if (rate >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <UserCheck className="h-4 w-4" />
            <span className="text-xs font-medium">Current Rate</span>
          </div>
          <div className={`text-lg font-bold ${getRetentionColor(currentRate)}`}>
            {currentRate}%
          </div>
          <div className="text-xs text-muted-foreground">
            {getRetentionStatus(currentRate)}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Trend</span>
          </div>
          <div className={`text-lg font-bold ${trend >= 0 ? 'text-success' : 'text-warning'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
          <div className="text-xs text-muted-foreground">vs. Previous</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Avg Rate</span>
          </div>
          <div className="text-lg font-bold">{averageRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">6 Month Avg</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="period" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <YAxis 
              domain={[60, 100]}
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === 'retentionRate' ? 'Retention Rate' : name
              ]}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="retentionRate" 
              stroke="hsl(var(--success))" 
              fillOpacity={1} 
              fill="url(#retentionGradient)"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-muted/30 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2">Retention Insights</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>• {trend >= 0 ? 'Retention rate is improving' : 'Retention rate needs attention'}</div>
          <div>• {currentRate >= averageRate ? 'Above average performance' : 'Below average performance'}</div>
          <div>• Target retention rate: 90%+ for optimal portfolio health</div>
        </div>
      </div>
    </div>
  );
};