import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/lib/currencyUtils";

interface IncomeSourcesChartProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

const COLORS = {
  rentalIncome: 'hsl(var(--chart-1))',
  dividends: 'hsl(var(--chart-2))',
  interest: 'hsl(var(--chart-3))',
  appreciation: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

export const IncomeSourcesChart = ({ landlordId, portfolioId, userId }: IncomeSourcesChartProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);
  const { currency } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>Monthly income breakdown by source</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Rental Income', value: metrics.incomeSources.rentalIncome },
    { name: 'Dividends', value: metrics.incomeSources.dividends },
    { name: 'Interest', value: metrics.incomeSources.interest },
    { name: 'Appreciation', value: metrics.incomeSources.appreciation },
    { name: 'Other', value: metrics.incomeSources.other },
  ].filter(item => item.value > 0);

  const formatValue = (value: number) => `${currencySymbol}${value.toLocaleString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Sources</CardTitle>
        <CardDescription>Monthly income breakdown by source</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatValue(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
