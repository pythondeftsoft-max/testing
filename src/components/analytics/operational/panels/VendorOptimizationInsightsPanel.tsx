import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';

const mockInsights = [
  {
    type: 'savings',
    title: 'Consolidation Opportunity',
    message: 'Combining HVAC contracts with Vendor A could save $8K annually',
    impact: 'high',
    savings: 8000
  },
  {
    type: 'warning',
    title: 'Performance Alert',
    message: 'Vendor C response times increased 15% over last quarter',
    impact: 'medium',
    savings: 0
  },
  {
    type: 'success',
    title: 'Cost Efficiency Improved',
    message: 'Vendor B pricing 12% below market average with quality maintained',
    impact: 'medium',
    savings: 3500
  },
  {
    type: 'recommendation',
    title: 'Contract Renewal Strategy',
    message: 'Consider multi-year contract with Vendor D for 15% discount',
    impact: 'high',
    savings: 6300
  },
];

export const VendorOptimizationInsightsPanel: React.FC = () => {
  const totalSavings = mockInsights.reduce((sum, i) => sum + i.savings, 0);

  const getIcon = (type: string) => {
    switch (type) {
      case 'savings': return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-primary" />;
      default: return <Lightbulb className="h-5 w-5 text-accent" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Optimization Insights</h3>
        <Badge variant="default">
          ${(totalSavings / 1000).toFixed(1)}K Potential Savings
        </Badge>
      </div>

      <div className="space-y-4">
        {mockInsights.map((insight, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getIcon(insight.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge variant={getImpactColor(insight.impact) as any}>
                    {insight.impact} impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insight.message}</p>
                {insight.savings > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-500">
                      ${(insight.savings / 1000).toFixed(1)}K annual savings
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
