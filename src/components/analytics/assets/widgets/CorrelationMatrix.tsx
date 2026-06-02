import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const CorrelationMatrix = () => {
  const getCorrelationColor = (value: number) => {
    if (value >= 0.7) return 'bg-green-500/20 text-green-600';
    if (value >= 0.3) return 'bg-blue-500/20 text-blue-600';
    if (value >= 0) return 'bg-gray-500/20 text-gray-600';
    if (value >= -0.3) return 'bg-orange-500/20 text-orange-600';
    return 'bg-red-500/20 text-red-600';
  };
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Correlation Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Asset</th>
                {['BTC', 'ETH', 'AAPL', 'TSLA', 'MSFT'].map((asset) => (
                  <th key={asset} className="text-center p-2 font-medium">{asset}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockPortfolioData.correlationMatrix.map((row) => (
                <tr key={row.asset}>
                  <td className="p-2 font-medium">{row.asset}</td>
                  <td className={`p-2 text-center ${getCorrelationColor(row.BTC)}`}>
                    {row.BTC.toFixed(2)}
                  </td>
                  <td className={`p-2 text-center ${getCorrelationColor(row.ETH)}`}>
                    {row.ETH.toFixed(2)}
                  </td>
                  <td className={`p-2 text-center ${getCorrelationColor(row.AAPL)}`}>
                    {row.AAPL.toFixed(2)}
                  </td>
                  <td className={`p-2 text-center ${getCorrelationColor(row.TSLA)}`}>
                    {row.TSLA.toFixed(2)}
                  </td>
                  <td className={`p-2 text-center ${getCorrelationColor(row.MSFT)}`}>
                    {row.MSFT.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>1.0 = Perfect positive correlation | 0.0 = No correlation | -1.0 = Perfect negative correlation</p>
        </div>
      </CardContent>
    </Card>
  );
};
