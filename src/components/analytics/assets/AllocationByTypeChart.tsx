import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { type SupportedCurrency } from '@/lib/currencyUtils';
import { useAnalyticsNavigation } from '@/hooks/useAnalyticsNavigation';

interface AllocationByTypeChartProps {
  data: Record<string, number>;
  isLoading: boolean;
  currency?: SupportedCurrency;
  onCategoryClick?: (categoryName: string) => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--openkey-gold))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(160, 60%, 45%)',
  'hsl(200, 80%, 50%)',
];

export const AllocationByTypeChart = ({ data, isLoading, currency = 'USD', onCategoryClick }: AllocationByTypeChartProps) => {
  const { navigateToAssets } = useAnalyticsNavigation();

  const handlePieClick = (entry: any) => {
    if (onCategoryClick) {
      onCategoryClick(entry.name);
    } else {
      // Navigate to assets with category filter
      const params = new URLSearchParams(window.location.search);
      params.set('tab', 'assets');
      params.set('assetCategory', entry.name);
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      navigateToAssets();
      
      // Scroll to assets grid
      setTimeout(() => {
        const assetsGrid = document.getElementById('assets-grid');
        if (assetsGrid) {
          assetsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ name: 'No Data', value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
              fill="hsl(var(--muted))"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center text-sm text-muted-foreground mt-2">
          No allocation data
        </div>
      </div>
    );
  }

  const chartData = Object.entries(data).map(([type, value]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: Number(value),
    percentage: 0 // Will be calculated by recharts
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate percentages
  const dataWithPercentages = chartData.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            <CurrencyDisplay
              amount={data.value}
              currency={currency}
              variant="compact"
              className="inline"
            /> ({data.payload.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentages}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={handlePieClick}
                className="cursor-pointer"
              >
                {dataWithPercentages.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value, entry: any) => `${value} (${entry.payload?.percentage?.toFixed(1)}%)`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};