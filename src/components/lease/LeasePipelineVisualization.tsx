import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface LeasePipelineVisualizationProps {
  units: any[];
  renewals: any[];
}

export const LeasePipelineVisualization: React.FC<LeasePipelineVisualizationProps> = ({ 
  units, 
  renewals 
}) => {
  const today = new Date();
  const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Active Leases (all occupied units)
  const activeLeases = units.filter(u => u.status === 'occupied').length;

  // Expiring Soon (leases ending in next 60 days)
  const expiringSoon = units.filter(unit => {
    if (!unit.lease_end_date || unit.status !== 'occupied') return false;
    const leaseEndDate = new Date(unit.lease_end_date);
    return leaseEndDate <= sixtyDaysFromNow && leaseEndDate >= today;
  }).length;

  // Renewal Started (pending, sent, negotiating)
  const renewalStarted = renewals.filter(r => 
    ['pending', 'sent', 'negotiating'].includes(r.renewal_status)
  ).length;

  // Renewed/Completed
  const renewedCompleted = renewals.filter(r => 
    r.renewal_status === 'completed'
  ).length;

  const stages = [
    { label: 'Active Leases', count: activeLeases, color: 'bg-primary' },
    { label: 'Expiring Soon', count: expiringSoon, color: 'bg-warning' },
    { label: 'Renewal Started', count: renewalStarted, color: 'bg-info' },
    { label: 'Renewed', count: renewedCompleted, color: 'bg-success' }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Lease Pipeline</h3>
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.label}>
            <div className="flex-1 min-w-0">
              <div className={`${stage.color} rounded-lg p-4 text-center transition-all hover:scale-105`}>
                <div className="text-2xl font-bold text-white mb-1">{stage.count}</div>
                <div className="text-xs text-white/90 font-medium">{stage.label}</div>
              </div>
            </div>
            
            {index < stages.length - 1 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};
