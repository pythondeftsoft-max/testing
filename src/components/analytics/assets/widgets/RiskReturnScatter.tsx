import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const RiskReturnScatter = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Risk-Return Scatter Plot</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              dataKey="risk" 
              name="Risk" 
              unit="%" 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="number" 
              dataKey="return" 
              name="Return" 
              unit="%" 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Return', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="value" range={[100, 1000]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'Risk') return [`${value}%`, 'Volatility'];
                if (name === 'Return') return [`${value}%`, 'Return'];
                return [value, name];
              }}
              labelFormatter={(label: string) => `Asset: ${label}`}
            />
            <Scatter 
              name="Assets" 
              data={mockPortfolioData.riskReturnData} 
              fill="hsl(var(--primary))"
              label={{ dataKey: 'asset', position: 'top' }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
