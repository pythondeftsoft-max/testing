import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AssetPerformanceChartProps {
  data: Array<{
    date: string;
    value: number;
    income: number;
    expenses: number;
  }>;
  title?: string;
  description?: string;
}

export const AssetPerformanceChart = ({ 
  data, 
  title = "Portfolio Performance", 
  description = "Value, income, and expenses over time" 
}: AssetPerformanceChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const trend = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  const isPositiveTrend = trend >= 0;

  const formatTooltipValue = (value: number, name: string) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return [formatCurrency(value), label];
  };

  const formatXAxisLabel = (dateString: string) => {
    const date = new Date(dateString + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isPositiveTrend ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveTrend ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              className="text-xs"
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              className="text-xs"
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Month: ${formatXAxisLabel(label)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              name="Portfolio Value"
            />
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
              name="Monthly Income"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2 }}
              name="Monthly Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};