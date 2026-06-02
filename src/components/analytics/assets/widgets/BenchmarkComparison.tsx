import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const BenchmarkComparison = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Benchmark Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockPortfolioData.benchmarkComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [`${value}%`, 'Return']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Your Portfolio"
            />
            <Line 
              type="monotone" 
              dataKey="sp500" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="S&P 500"
            />
            <Line 
              type="monotone" 
              dataKey="bitcoin" 
              stroke="#f7931a" 
              strokeWidth={2}
              name="Bitcoin"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
