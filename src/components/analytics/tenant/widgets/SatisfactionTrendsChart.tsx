import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Heart, MessageSquare, Wrench } from 'lucide-react';

interface SatisfactionTrendsChartProps {
  data?: Array<{
    month: string;
    overall: number;
    communication: number;
    maintenance: number;
  }>;
}

export const SatisfactionTrendsChart: React.FC<SatisfactionTrendsChartProps> = ({ data }) => {
  // Mock data if none provided
  const chartData = data || [
    { month: 'Jan', overall: 82, communication: 85, maintenance: 78 },
    { month: 'Feb', overall: 84, communication: 87, maintenance: 81 },
    { month: 'Mar', overall: 86, communication: 89, maintenance: 83 },
    { month: 'Apr', overall: 85, communication: 88, maintenance: 82 },
    { month: 'May', overall: 87, communication: 90, maintenance: 84 },
    { month: 'Jun', overall: 89, communication: 92, maintenance: 86 }
  ];

  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];

  const getTrend = (current: number, previous: number) => {
    const change = current - previous;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      percentage: Math.abs((change / previous) * 100)
    };
  };

  const overallTrend = getTrend(latestData.overall, previousData.overall);
  const commTrend = getTrend(latestData.communication, previousData.communication);
  const maintTrend = getTrend(latestData.maintenance, previousData.maintenance);

  return (
    <div className="space-y-4">
      {/* Current Scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Heart className="h-4 w-4" />
            <span className="text-xs font-medium">Overall</span>
          </div>
          <div className="text-lg font-bold">{latestData.overall}%</div>
          <div className={`text-xs ${overallTrend.isPositive ? 'text-success' : 'text-warning'}`}>
            {overallTrend.isPositive ? '↑' : '↓'} {overallTrend.value}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">Communication</span>
          </div>
          <div className="text-lg font-bold">{latestData.communication}%</div>
          <div className={`text-xs ${commTrend.isPositive ? 'text-success' : 'text-warning'}`}>
            {commTrend.isPositive ? '↑' : '↓'} {commTrend.value}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Wrench className="h-4 w-4" />
            <span className="text-xs font-medium">Maintenance</span>
          </div>
          <div className="text-lg font-bold">{latestData.maintenance}%</div>
          <div className={`text-xs ${maintTrend.isPositive ? 'text-success' : 'text-warning'}`}>
            {maintTrend.isPositive ? '↑' : '↓'} {maintTrend.value}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <YAxis 
              domain={[60, 100]}
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overall" 
              name="Overall Satisfaction"
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="communication" 
              name="Communication"
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="maintenance" 
              name="Maintenance"
              stroke="hsl(var(--warning))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--warning))', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};