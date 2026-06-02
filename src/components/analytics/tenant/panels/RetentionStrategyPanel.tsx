import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, TrendingUp } from 'lucide-react';

export const RetentionStrategyPanel: React.FC = () => {
  const strategies = [
    {
      priority: 'high',
      strategy: 'Early Renewal Incentives',
      description: 'Offer 5% rent discount for tenants who renew 3+ months early',
      impact: 'Could improve retention by 15%',
      properties: 3
    },
    {
      priority: 'medium',
      strategy: 'Maintenance Satisfaction Program',
      description: 'Implement 24-hour emergency response guarantee',
      impact: 'Target at-risk tenants with low maintenance scores',
      properties: 7
    },
    {
      priority: 'medium',
      strategy: 'Communication Enhancement',
      description: 'Monthly check-in calls with tenants',
      impact: 'Strengthen relationships and identify issues early',
      properties: 12
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Retention Strategy Recommendations</h3>
      </div>
      <div className="space-y-4">
        {strategies.map((item, index) => (
          <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.strategy}</span>
              </div>
              <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>
                {item.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-success">{item.impact}</span>
            </div>
            <div className="text-xs text-muted-foreground">Affects {item.properties} properties</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
