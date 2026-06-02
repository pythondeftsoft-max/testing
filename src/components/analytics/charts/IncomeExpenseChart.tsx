import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface IncomeExpenseChartProps {
  data: Array<{
    date: string;
    monthly_income: number;
    monthly_expenses: number;
    net_operating_income: number;
  }>;
  isLoading?: boolean;
}

export const IncomeExpenseChart = ({ data, isLoading }: IncomeExpenseChartProps) => {
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '2y' | 'all'>('1y');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">Loading income data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No income/expense data available</p>
            <p className="text-sm">Data will appear as transactions are recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter data based on time range
  const now = new Date();
  const filteredData = data.filter(item => {
    const itemDate = new Date(item.date);
    const monthsAgo = (now.getFullYear() - itemDate.getFullYear()) * 12 + (now.getMonth() - itemDate.getMonth());
    
    switch (timeRange) {
      case '6m': return monthsAgo <= 6;
      case '1y': return monthsAgo <= 12;
      case '2y': return monthsAgo <= 24;
      default: return true;
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate totals
  const totalIncome = filteredData.reduce((sum, item) => sum + item.monthly_income, 0);
  const totalExpenses = filteredData.reduce((sum, item) => sum + item.monthly_expenses, 0);
  const netIncome = totalIncome - totalExpenses;
  const avgMonthlyNet = filteredData.length > 0 ? netIncome / filteredData.length : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">
            {new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Income vs Expenses
          </CardTitle>
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6M</SelectItem>
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="2y">2Y</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </p>
          </div>
          <Badge variant={avgMonthlyNet >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {formatCurrency(avgMonthlyNet)}/mo avg
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                dataKey="monthly_income" 
                name="Income"
                fill="hsl(142, 76%, 36%)"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="monthly_expenses" 
                name="Expenses"
                fill="hsl(0, 84%, 60%)"
                radius={[2, 2, 0, 0]}
              />
              <Line 
                type="monotone" 
                dataKey="net_operating_income" 
                name="Net Income"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};