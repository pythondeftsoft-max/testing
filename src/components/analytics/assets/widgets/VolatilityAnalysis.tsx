import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const VolatilityAnalysis = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Volatility Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Asset</th>
                <th className="text-right p-2">Volatility</th>
                <th className="text-right p-2">Beta</th>
                <th className="text-right p-2">Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {mockPortfolioData.volatilityMetrics.map((metric) => (
                <tr key={metric.asset} className="border-b border-border/50">
                  <td className="p-2 font-medium">{metric.asset}</td>
                  <td className="p-2 text-right">{metric.volatility}%</td>
                  <td className="p-2 text-right">{metric.beta.toFixed(2)}</td>
                  <td className="p-2 text-right">{metric.stdDev.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Higher volatility indicates greater price fluctuations and risk</p>
        </div>
      </CardContent>
    </Card>
  );
};
