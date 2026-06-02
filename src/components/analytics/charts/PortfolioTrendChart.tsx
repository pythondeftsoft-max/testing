import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PortfolioTrendChartProps {
  data: Array<{
    date: string;
    total_value: number;
    real_estate_value: number;
    other_assets_value: number;
    net_worth: number;
    monthly_income: number;
  }>;
  isLoading?: boolean;
}

export const PortfolioTrendChart = ({ data, isLoading }: PortfolioTrendChartProps) => {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const [metric, setMetric] = useState<'total_value' | 'net_worth' | 'monthly_income'>('total_value');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">Loading performance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No performance data available yet</p>
            <p className="text-sm">Data will appear as snapshots are collected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter data based on time range
  const now = new Date();
  const filteredData = data.filter(item => {
    const itemDate = new Date(item.date);
    const daysAgo = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
    
    switch (timeRange) {
      case '30d': return daysAgo <= 30;
      case '90d': return daysAgo <= 90;
      case '1y': return daysAgo <= 365;
      default: return true;
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate performance metrics
  const currentValue = filteredData[filteredData.length - 1]?.[metric] || 0;
  const previousValue = filteredData[0]?.[metric] || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

  const metricLabels = {
    total_value: 'Total Portfolio Value',
    net_worth: 'Net Worth',
    monthly_income: 'Monthly Income'
  };

  const formatValue = (value: number) => {
    if (metric === 'monthly_income') {
      return formatCurrency(value);
    }
    return formatCurrency(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_value">Total Value</SelectItem>
                <SelectItem value="net_worth">Net Worth</SelectItem>
                <SelectItem value="monthly_income">Monthly Income</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30D</SelectItem>
                <SelectItem value="90d">90D</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold">{formatValue(currentValue)}</p>
            <p className="text-sm text-muted-foreground">{metricLabels[metric]}</p>
          </div>
          <Badge variant={change >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {changePercent.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                className="text-xs"
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value), metricLabels[metric]]}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="hsl(var(--primary))"
                fill="url(#portfolioGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};