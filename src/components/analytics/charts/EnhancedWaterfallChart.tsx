import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';

interface WaterfallData {
  name: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
  displayValue: number;
}

interface EnhancedWaterfallChartProps {
  grossRent: number;
  expenses: {
    mortgage: number;
    insurance: number;
    maintenance: number;
    management: number;
    taxes: number;
    other: number;
  };
  height?: number;
}

const EnhancedWaterfallChart = ({ grossRent, expenses, height = 350 }: EnhancedWaterfallChartProps) => {
  // Calculate cumulative values for waterfall effect
  let runningTotal = grossRent;
  
  const data: WaterfallData[] = [
    {
      name: 'Gross Rent',
      value: grossRent,
      cumulative: grossRent,
      type: 'positive',
      displayValue: grossRent
    }
  ];

  // Add each expense
  Object.entries(expenses).forEach(([key, value]) => {
    if (value > 0) {
      runningTotal -= value;
      data.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: -value,
        cumulative: runningTotal,
        type: 'negative',
        displayValue: value
      });
    }
  });

  // Add net income
  const netIncome = runningTotal;
  data.push({
    name: 'Net Income',
    value: netIncome,
    cumulative: netIncome,
    type: 'total',
    displayValue: netIncome
  });

  const getBarColor = (type: string, value: number) => {
    switch (type) {
      case 'positive':
        return 'hsl(var(--success))';
      case 'negative':
        return 'hsl(var(--destructive))';
      case 'total':
        return value >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Amount: </span>
              <span className="font-medium" style={{ color: payload[0].color }}>
                ${Math.abs(data.displayValue).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Running Total: </span>
              <span className="font-medium text-foreground">
                ${data.cumulative.toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatAxisLabel = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Monthly Cash Flow Analysis</h3>
        <p className="text-sm text-muted-foreground">Revenue to Net Income Waterfall</p>
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success"></div>
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive"></div>
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span className="text-muted-foreground">Net Result</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={formatAxisLabel}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
          <Bar 
            dataKey="displayValue" 
            radius={[4, 4, 0, 0]}
            stroke="transparent"
            strokeWidth={1}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.type, entry.displayValue)}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnhancedWaterfallChart;