import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface AreaChartData {
  name: string;
  value: number;
  trend?: number;
}

interface ModernAreaChartProps {
  data: AreaChartData[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  dataKey?: string;
}

const ModernAreaChart = ({ 
  data, 
  height = 200, 
  color = "hsl(var(--openkey-blue))",
  showGrid = true,
  dataKey = "value"
}: ModernAreaChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p style={{ color }} className="text-sm">
            {payload[0].name}: {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        )}
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill="url(#areaGradient)"
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: "white" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ModernAreaChart;