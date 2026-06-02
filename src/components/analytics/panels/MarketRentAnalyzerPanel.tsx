import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const MarketRentAnalyzerPanel: React.FC = () => {
  const properties = [
    { 
      address: '123 Main St',
      currentRent: 1450,
      marketRent: 1600,
      gap: 150,
      percentDiff: 10.3,
      recommendation: 'Strong increase potential'
    },
    { 
      address: '456 Oak Avenue',
      currentRent: 1750,
      marketRent: 1720,
      gap: -30,
      percentDiff: -1.7,
      recommendation: 'At market rate'
    },
    { 
      address: '789 Pine Road',
      currentRent: 1300,
      marketRent: 1500,
      gap: 200,
      percentDiff: 15.4,
      recommendation: 'High increase opportunity'
    },
    { 
      address: '321 Elm Street',
      currentRent: 1625,
      marketRent: 1650,
      gap: 25,
      percentDiff: 1.5,
      recommendation: 'Minor adjustment possible'
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Market Rent Analysis by Property</h3>
      </div>
      <div className="space-y-3">
        {properties.map((prop, index) => (
          <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{prop.address}</div>
                <div className="text-sm text-muted-foreground mt-1">{prop.recommendation}</div>
              </div>
              <Badge variant={prop.gap > 0 ? 'default' : 'secondary'}>
                {prop.gap > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(prop.percentDiff).toFixed(1)}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current</div>
                <div className="font-medium">${prop.currentRent.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Market</div>
                <div className="font-medium">${prop.marketRent.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Gap</div>
                <div className={`font-medium ${prop.gap > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                  ${Math.abs(prop.gap)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
