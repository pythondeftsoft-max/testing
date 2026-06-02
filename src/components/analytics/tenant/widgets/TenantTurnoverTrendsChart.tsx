import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

interface TenantTurnoverTrendsChartProps {
  data?: Array<{
    month: string;
    moveIns: number;
    moveOuts: number;
    net: number;
  }>;
}

export const TenantTurnoverTrendsChart: React.FC<TenantTurnoverTrendsChartProps> = ({ data }) => {
  // Mock data if none provided
  const chartData = data || [
    { month: 'Jan', moveIns: 8, moveOuts: 3, net: 5 },
    { month: 'Feb', moveIns: 6, moveOuts: 4, net: 2 },
    { month: 'Mar', moveIns: 12, moveOuts: 2, net: 10 },
    { month: 'Apr', moveIns: 9, moveOuts: 5, net: 4 },
    { month: 'May', moveIns: 7, moveOuts: 6, net: 1 },
    { month: 'Jun', moveIns: 11, moveOuts: 3, net: 8 }
  ];

  const totalMoveIns = chartData.reduce((sum, item) => sum + item.moveIns, 0);
  const totalMoveOuts = chartData.reduce((sum, item) => sum + item.moveOuts, 0);
  const netTurnover = totalMoveIns - totalMoveOuts;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-success mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Move-ins</span>
          </div>
          <div className="text-xl font-bold text-success">{totalMoveIns}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warning mb-1">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">Move-outs</span>
          </div>
          <div className="text-xl font-bold text-warning">{totalMoveOuts}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Net Growth</span>
          </div>
          <div className={`text-xl font-bold ${netTurnover >= 0 ? 'text-success' : 'text-warning'}`}>
            {netTurnover >= 0 ? '+' : ''}{netTurnover}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="moveIns" 
              name="Move-ins" 
              fill="hsl(var(--success))" 
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="moveOuts" 
              name="Move-outs" 
              fill="hsl(var(--warning))" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};