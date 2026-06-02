import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export const LeaseRenewalPipelineChart: React.FC = () => {
  const pipelineData = [
    { stage: 'Expiring Soon', count: 12, color: 'bg-primary' },
    { stage: 'Contacted', count: 8, color: 'bg-info' },
    { stage: 'In Negotiation', count: 5, color: 'bg-warning' },
    { stage: 'Renewed', count: 3, color: 'bg-success' }
  ];

  const total = pipelineData[0].count;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Lease Renewal Pipeline</h3>
      </div>
      <div className="space-y-3">
        {pipelineData.map((stage, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.stage}</span>
              <Badge variant="secondary">{stage.count} leases</Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${stage.color} transition-all duration-300`}
                style={{ width: `${(stage.count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Conversion Rate</span>
          <span className="font-semibold text-success">{((pipelineData[3].count / total) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
};
