import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const PerformanceAttribution = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Performance Attribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={mockPortfolioData.performanceAttribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category"
              dataKey="factor"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={150}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [`${value}%`, 'Contribution']}
            />
            <Bar dataKey="contribution" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-xs text-muted-foreground">
          Total Return: {mockPortfolioData.totalGainLossPercent}%
        </div>
      </CardContent>
    </Card>
  );
};
