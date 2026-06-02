import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const SharpeRatioCalculator = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Sharpe Ratio Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Asset</th>
                <th className="text-right p-2">Sharpe Ratio</th>
                <th className="text-right p-2">Return</th>
                <th className="text-right p-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {mockPortfolioData.sharpeRatios.map((ratio) => (
                <tr key={ratio.asset} className="border-b border-border/50">
                  <td className="p-2 font-medium">{ratio.asset}</td>
                  <td className={`p-2 text-right font-semibold ${
                    ratio.sharpe > 1 ? 'text-green-600' : ratio.sharpe > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {ratio.sharpe.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">{ratio.return}%</td>
                  <td className="p-2 text-right">{ratio.risk}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>Sharpe Ratio = (Return - Risk-Free Rate) / Risk</p>
          <p>Higher values indicate better risk-adjusted returns</p>
        </div>
      </CardContent>
    </Card>
  );
};
