import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const DrawdownAnalysis = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Drawdown Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={mockPortfolioData.drawdownData}>
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
              formatter={(value: number) => [`${value}%`, 'Drawdown']}
            />
            <Area 
              type="monotone" 
              dataKey="drawdown" 
              stroke="#ef4444" 
              fill="#ef4444"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground">
          Maximum Drawdown: -5.8% (March)
        </div>
      </CardContent>
    </Card>
  );
};
