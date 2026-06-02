import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/lib/currencyUtils";

interface ExpenseCategoriesChartProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const ExpenseCategoriesChart = ({ landlordId, portfolioId, userId }: ExpenseCategoriesChartProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);
  const { currency } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>Monthly expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Property', value: metrics.expenseCategories.propertyExpenses },
    { name: 'Asset Fees', value: metrics.expenseCategories.assetFees },
    { name: 'Maintenance', value: metrics.expenseCategories.maintenance },
    { name: 'Insurance', value: metrics.expenseCategories.insurance },
    { name: 'Taxes', value: metrics.expenseCategories.taxes },
    { name: 'Other', value: metrics.expenseCategories.other },
  ].filter(item => item.value > 0);

  const formatValue = (value: number) => `${currencySymbol}${value.toLocaleString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories</CardTitle>
        <CardDescription>Monthly expenses by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              formatter={(value: number) => formatValue(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
