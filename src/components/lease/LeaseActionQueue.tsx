import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Mail, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionItem {
  id: string;
  title: string;
  count: number;
  rentAtRisk: number;
  severity: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  action: () => void;
}

interface LeaseActionQueueProps {
  units: any[];
  renewals: any[];
  onNavigateToFiltered: (filter: string) => void;
}

export const LeaseActionQueue: React.FC<LeaseActionQueueProps> = ({ 
  units, 
  renewals, 
  onNavigateToFiltered 
}) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Calculate expired leases
  const expiredLeases = units.filter(unit => {
    if (!unit.lease_end_date || unit.status !== 'occupied') return false;
    const leaseEndDate = new Date(unit.lease_end_date);
    return leaseEndDate < today;
  });
  const expiredRent = expiredLeases.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);

  // Calculate expiring without renewal (<30 days, no active renewal)
  const expiringWithoutRenewal = units.filter(unit => {
    if (!unit.lease_end_date || unit.status !== 'occupied') return false;
    const leaseEndDate = new Date(unit.lease_end_date);
    const isExpiringSoon = leaseEndDate <= thirtyDaysFromNow && leaseEndDate >= today;
    
    const hasActiveRenewal = renewals.some(
      renewal => renewal.property_id === unit.property_id && 
                 ['pending', 'sent', 'negotiating'].includes(renewal.renewal_status)
    );
    
    return isExpiringSoon && !hasActiveRenewal;
  });
  const expiringRent = expiringWithoutRenewal.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);

  // Pending requests (tenant initiated, awaiting landlord response)
  const pendingRequests = renewals.filter(r => r.renewal_status === 'pending');
  const pendingRent = pendingRequests.reduce((sum, r) => {
    const unit = units.find(u => u.property_id === r.property_id);
    return sum + (unit?.monthly_rent || 0);
  }, 0);

  // Offers awaiting response (sent by landlord, awaiting tenant)
  const sentOffers = renewals.filter(r => r.renewal_status === 'sent');
  const sentRent = sentOffers.reduce((sum, r) => {
    const unit = units.find(u => u.property_id === r.property_id);
    return sum + (unit?.monthly_rent || 0);
  }, 0);

  const actionItems: ActionItem[] = ([
    {
      id: 'expired',
      title: 'Expired Leases',
      count: expiredLeases.length,
      rentAtRisk: expiredRent,
      severity: 'critical' as const,
      icon: <AlertCircle className="h-4 w-4" />,
      action: () => onNavigateToFiltered('expired')
    },
    {
      id: 'expiring',
      title: 'Expiring Without Renewal',
      count: expiringWithoutRenewal.length,
      rentAtRisk: expiringRent,
      severity: 'warning' as const,
      icon: <Clock className="h-4 w-4" />,
      action: () => onNavigateToFiltered('expiring')
    },
    {
      id: 'pending',
      title: 'Pending Requests',
      count: pendingRequests.length,
      rentAtRisk: pendingRent,
      severity: 'info' as const,
      icon: <Mail className="h-4 w-4" />,
      action: () => onNavigateToFiltered('pending')
    },
    {
      id: 'sent',
      title: 'Offers Awaiting Response',
      count: sentOffers.length,
      rentAtRisk: sentRent,
      severity: 'info' as const,
      icon: <FileText className="h-4 w-4" />,
      action: () => onNavigateToFiltered('sent')
    }
  ] as ActionItem[]).filter(item => item.count > 0);

  if (actionItems.length === 0) {
    return (
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Needs Your Attention</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">All caught up! No urgent actions needed.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Needs Your Attention</h3>
      <div className="space-y-3">
        {actionItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${
                item.severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                item.severity === 'warning' ? 'bg-warning/10 text-warning' :
                'bg-primary/10 text-primary'
              }`}>
                {item.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant={
                    item.severity === 'critical' ? 'destructive' :
                    item.severity === 'warning' ? 'warning' :
                    'secondary'
                  }>
                    {item.count}
                  </Badge>
                </div>
                {item.rentAtRisk > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ${item.rentAtRisk.toLocaleString()}/mo at risk
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={item.action}
              className="ml-4"
            >
              View All →
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
