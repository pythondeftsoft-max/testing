import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface ModernDonutChartProps {
  data: DonutChartData[];
  centerMetric?: {
    value: string;
    label: string;
  };
  height?: number;
}

const ModernDonutChart = ({ data, centerMetric, height = 200 }: ModernDonutChartProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = data.payload.total || data.value;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-card-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            <span style={{ color: data.color }} className="font-medium">
              {data.value} properties
            </span>
            <span className="ml-2">({percentage}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    if (percent < 0.08) return null; // Don't show labels for slices less than 8%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--background))" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-bold drop-shadow-md"
        style={{ 
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          fontSize: '12px'
        }}
      >
        {value}
      </text>
    );
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={height * 0.4}
            innerRadius={height * 0.22}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {centerMetric && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{centerMetric.value}</div>
            <div className="text-xs text-muted-foreground">{centerMetric.label}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernDonutChart;