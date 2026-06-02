import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface RevenueBarData {
  name: string;
  value: number;
  color: string;
}

interface RevenueSourcesBarChartProps {
  data: RevenueBarData[];
  total: number;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.total > 0 ? ((data.value / data.total) * 100).toFixed(1) : '0.0';
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          ${data.value.toLocaleString()} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export const RevenueSourcesBarChart = ({ 
  data, 
  total, 
  height = 180 
}: RevenueSourcesBarChartProps) => {
  // Add total to each data item for tooltip calculation
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={dataWithTotal}
        layout="horizontal"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        barCategoryGap="20%"
      >
        <XAxis type="number" hide />
        <YAxis 
          type="category" 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          barSize={12} 
          radius={[0, 6, 6, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {dataWithTotal.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};