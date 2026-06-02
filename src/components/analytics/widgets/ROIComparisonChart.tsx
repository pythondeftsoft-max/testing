import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface ROIComparisonChartProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const ROIComparisonChart = ({ landlordId, portfolioId, userId }: ROIComparisonChartProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROI Comparison</CardTitle>
          <CardDescription>Return on investment by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Properties', value: metrics.propertyROI },
    { name: 'Assets', value: metrics.assetROI },
    { name: 'Overall', value: metrics.overallROI },
  ];

  const getColor = (value: number) => {
    if (value > 0) return 'hsl(var(--success))';
    if (value < 0) return 'hsl(var(--destructive))';
    return 'hsl(var(--muted))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Comparison</CardTitle>
        <CardDescription>Return on investment by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
