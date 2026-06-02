import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface SparklineData {
  value: number;
}

interface TrendSparklineChartProps {
  data: SparklineData[];
  height?: number;
  color?: string;
  showDots?: boolean;
}

const TrendSparklineChart = ({ 
  data, 
  height = 40, 
  color = "hsl(var(--openkey-blue))",
  showDots = false
}: TrendSparklineChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="text-xs text-muted-foreground">No data</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={showDots ? { fill: color, strokeWidth: 0, r: 2 } : false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendSparklineChart;