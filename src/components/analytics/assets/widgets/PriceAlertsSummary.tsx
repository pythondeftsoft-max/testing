import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle } from 'lucide-react';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const PriceAlertsSummary = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Price Alerts Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockPortfolioData.priceAlerts.map((alert, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {alert.status === 'triggered' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Bell className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <div className="font-medium">{alert.asset}</div>
                  <div className="text-sm text-muted-foreground">
                    {alert.type} ${alert.target}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">${alert.current}</div>
                <div className={`text-xs ${
                  alert.status === 'triggered' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {alert.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
