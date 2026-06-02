import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface PropertyPerformanceData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  occupancyRate: number;
}

interface PropertyPerformanceChartProps {
  data: PropertyPerformanceData[];
  height?: number;
}

const PropertyPerformanceChart = ({ data, height = 300 }: PropertyPerformanceChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name === 'Occupancy Rate' 
                ? `${entry.value}%` 
                : `$${entry.value.toLocaleString()}`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="month" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          yAxisId="left"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        <Bar 
          yAxisId="left"
          dataKey="revenue" 
          fill="hsl(var(--openkey-blue))" 
          name="Revenue"
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          yAxisId="left"
          dataKey="expenses" 
          fill="hsl(var(--destructive))" 
          name="Expenses"
          radius={[2, 2, 0, 0]}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="occupancyRate" 
          stroke="hsl(var(--openkey-gold))" 
          strokeWidth={3}
          name="Occupancy Rate"
          dot={{ fill: "hsl(var(--openkey-gold))", strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PropertyPerformanceChart;