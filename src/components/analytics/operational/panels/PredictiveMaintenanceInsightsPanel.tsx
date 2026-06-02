import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';

const mockInsights = [
  { 
    type: 'warning', 
    title: 'HVAC System Alert', 
    message: 'Property C HVAC system showing signs of wear. Recommend preventive maintenance within 30 days.',
    priority: 'high'
  },
  { 
    type: 'recommendation', 
    title: 'Cost Optimization', 
    message: 'Switching to preventive maintenance could save $15K annually based on current trends.',
    priority: 'medium'
  },
  { 
    type: 'insight', 
    title: 'Seasonal Pattern Detected', 
    message: 'Plumbing requests increase 40% in winter months. Consider proactive winterization.',
    priority: 'low'
  },
  { 
    type: 'warning', 
    title: 'Budget Threshold', 
    message: 'Electrical maintenance costs approaching 90% of quarterly budget.',
    priority: 'high'
  },
];

export const PredictiveMaintenanceInsightsPanel: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-primary" />;
      default: return <TrendingUp className="h-5 w-5 text-accent" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
        <Badge variant="outline">{mockInsights.length} Insights</Badge>
      </div>

      <div className="space-y-4">
        {mockInsights.map((insight, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getIcon(insight.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge variant={getPriorityColor(insight.priority) as any}>
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
