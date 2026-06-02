import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DonutChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

interface EnhancedDonutChartProps {
  data: DonutChartData[];
  centerMetric?: {
    value: string;
    label: string;
    subtitle?: string;
  };
  height?: number;
  showLegend?: boolean;
  title?: string;
}

const EnhancedDonutChart = ({ 
  data, 
  centerMetric, 
  height = 240, 
  showLegend = true,
  title 
}: EnhancedDonutChartProps) => {
  // Calculate percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <div className="space-y-1 mt-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Value: </span>
              <span className="font-medium" style={{ color: data.color }}>
                {data.value.toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Percentage: </span>
              <span className="font-medium text-foreground">
                {data.percentage.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 8) return null; // Don't show labels for slices less than 8%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold drop-shadow-sm"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!showLegend) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
      )}
      
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={dataWithPercentages}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={height * 0.32}
              innerRadius={height * 0.18}
              fill="#8884d8"
              dataKey="value"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {dataWithPercentages.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="transition-all hover:opacity-80 cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        
        {centerMetric && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-foreground leading-none">
                {centerMetric.value}
              </div>
              <div className="text-xs text-muted-foreground leading-none">
                {centerMetric.label}
              </div>
              {centerMetric.subtitle && (
                <div className="text-xs text-muted-foreground/80 leading-none">
                  {centerMetric.subtitle}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDonutChart;