import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const mockCosts = [
  { category: 'HVAC', cost: 12500, budget: 15000, variance: -2500, trend: 'down' },
  { category: 'Plumbing', cost: 9800, budget: 10000, variance: -200, trend: 'down' },
  { category: 'Electrical', cost: 8500, budget: 8000, variance: 500, trend: 'up' },
  { category: 'Landscaping', cost: 5200, budget: 6000, variance: -800, trend: 'down' },
  { category: 'Structural', cost: 18000, budget: 16000, variance: 2000, trend: 'up' },
];

export const MaintenanceCostAnalysisPanel: React.FC = () => {
  const totalCost = mockCosts.reduce((sum, c) => sum + c.cost, 0);
  const totalBudget = mockCosts.reduce((sum, c) => sum + c.budget, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Maintenance Cost Analysis</h3>
        <Badge variant={totalCost <= totalBudget ? 'default' : 'destructive'}>
          ${(totalCost / 1000).toFixed(0)}K / ${(totalBudget / 1000).toFixed(0)}K
        </Badge>
      </div>

      <div className="space-y-3">
        {mockCosts.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>${(item.cost / 1000).toFixed(1)}K</span>
                <span>•</span>
                <span>Budget: ${(item.budget / 1000).toFixed(0)}K</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.variance <= 0 ? 'default' : 'destructive'}>
                ${Math.abs(item.variance / 1000).toFixed(1)}K {item.variance <= 0 ? 'under' : 'over'}
              </Badge>
              {item.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
