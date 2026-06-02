import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface PropertiesVsAssetsChartProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const PropertiesVsAssetsChart = ({ landlordId, portfolioId, userId }: PropertiesVsAssetsChartProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties vs Assets</CardTitle>
          <CardDescription>Wealth distribution comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalValue = metrics.totalPropertyValue + metrics.totalAssetValue;
  const propertyPercent = totalValue > 0 ? (metrics.totalPropertyValue / totalValue) * 100 : 0;
  const assetPercent = totalValue > 0 ? (metrics.totalAssetValue / totalValue) * 100 : 0;

  const chartData = [
    { 
      name: 'Properties', 
      value: metrics.totalPropertyValue,
      percent: propertyPercent.toFixed(1),
    },
    { 
      name: 'Financial Assets', 
      value: metrics.totalAssetValue,
      percent: assetPercent.toFixed(1),
    },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-3))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties vs Assets</CardTitle>
        <CardDescription>Wealth distribution comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return `${label} (${payload[0].payload.percent}%)`;
                }
                return label;
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
