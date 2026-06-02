import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface WaterfallData {
  name: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
}

interface FinancialWaterfallChartProps {
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

const FinancialWaterfallChart = ({ grossRent, expenses, height = 300 }: FinancialWaterfallChartProps) => {
  const data: WaterfallData[] = [
    {
      name: 'Gross Rent',
      value: grossRent,
      cumulative: grossRent,
      type: 'positive'
    },
    {
      name: 'Mortgage',
      value: -expenses.mortgage,
      cumulative: grossRent - expenses.mortgage,
      type: 'negative'
    },
    {
      name: 'Insurance',
      value: -expenses.insurance,
      cumulative: grossRent - expenses.mortgage - expenses.insurance,
      type: 'negative'
    },
    {
      name: 'Maintenance',
      value: -expenses.maintenance,
      cumulative: grossRent - expenses.mortgage - expenses.insurance - expenses.maintenance,
      type: 'negative'
    },
    {
      name: 'Management',
      value: -expenses.management,
      cumulative: grossRent - expenses.mortgage - expenses.insurance - expenses.maintenance - expenses.management,
      type: 'negative'
    },
    {
      name: 'Taxes',
      value: -expenses.taxes,
      cumulative: grossRent - expenses.mortgage - expenses.insurance - expenses.maintenance - expenses.management - expenses.taxes,
      type: 'negative'
    },
    {
      name: 'Other',
      value: -expenses.other,
      cumulative: grossRent - Object.values(expenses).reduce((sum, exp) => sum + exp, 0),
      type: 'negative'
    },
    {
      name: 'Net Income',
      value: grossRent - Object.values(expenses).reduce((sum, exp) => sum + exp, 0),
      cumulative: grossRent - Object.values(expenses).reduce((sum, exp) => sum + exp, 0),
      type: 'total'
    }
  ];

  const getBarColor = (type: string, value: number) => {
    switch (type) {
      case 'positive':
        return 'hsl(var(--success))';
      case 'negative':
        return 'hsl(var(--destructive))';
      case 'total':
        return value >= 0 ? 'hsl(var(--openkey-blue))' : 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p style={{ color: payload[0].color }} className="text-sm">
            Value: ${Math.abs(data.value).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Running Total: ${data.cumulative.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Monthly Cash Flow Breakdown</h3>
        <p className="text-sm text-muted-foreground">Revenue vs. Expenses Waterfall Analysis</p>
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
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.type, entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialWaterfallChart;