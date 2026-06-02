import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const PortfolioRebalancing = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Rebalancing Suggestions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockPortfolioData.rebalancingSuggestions.map((suggestion) => (
            <div 
              key={suggestion.asset} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {suggestion.action === 'Reduce' ? (
                  <ArrowDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ArrowUp className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <div className="font-medium">{suggestion.asset}</div>
                  <div className="text-sm text-muted-foreground">
                    {suggestion.current}% → {suggestion.target}%
                  </div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${
                suggestion.action === 'Reduce' ? 'text-red-600' : 'text-green-600'
              }`}>
                {suggestion.action === 'Reduce' ? '' : '+'}{suggestion.difference}%
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          AI-powered recommendations based on your target allocations
        </div>
      </CardContent>
    </Card>
  );
};
