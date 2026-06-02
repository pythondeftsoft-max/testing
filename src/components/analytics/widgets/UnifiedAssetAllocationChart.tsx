import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useUnifiedPortfolioMetrics } from '@/hooks/useUnifiedPortfolioMetrics';

interface UnifiedAssetAllocationChartProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

const COLORS = {
  properties: 'hsl(var(--chart-1))',
  stocks: 'hsl(var(--chart-2))',
  crypto: 'hsl(var(--chart-3))',
  other: 'hsl(var(--chart-4))',
};

export const UnifiedAssetAllocationChart = ({ 
  landlordId, 
  portfolioId, 
  userId 
}: UnifiedAssetAllocationChartProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Properties', value: metrics.assetAllocation.properties, color: COLORS.properties },
    { name: 'Stocks/ETFs', value: metrics.assetAllocation.stocks, color: COLORS.stocks },
    { name: 'Crypto', value: metrics.assetAllocation.crypto, color: COLORS.crypto },
    { name: 'Other', value: metrics.assetAllocation.other, color: COLORS.other },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Asset Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
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
