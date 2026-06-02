import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle } from 'lucide-react';

interface LeaseExpirationCalendarChartProps {
  expirations?: Array<{
    month: string;
    count: number;
    properties: string[];
  }>;
}

export const LeaseExpirationCalendarChart: React.FC<LeaseExpirationCalendarChartProps> = ({ 
  expirations = [] 
}) => {
  // Mock data if none provided
  const mockData = expirations.length > 0 ? expirations : [
    { month: 'Feb 2025', count: 3, properties: ['123 Main St', '456 Oak Ave', '789 Pine Rd'] },
    { month: 'Mar 2025', count: 5, properties: ['321 Elm St', '654 Maple Dr', '987 Cedar Ln', '147 Birch Way', '258 Spruce Ct'] },
    { month: 'Apr 2025', count: 2, properties: ['369 Willow Rd', '741 Ash St'] },
    { month: 'May 2025', count: 4, properties: ['852 Hickory Ln', '963 Poplar Ave', '159 Cherry St', '357 Walnut Dr'] }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Upcoming Lease Expirations</h3>
      </div>
      <div className="space-y-3">
        {mockData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {item.count >= 4 && <AlertTriangle className="h-4 w-4 text-warning" />}
              <div>
                <div className="font-medium">{item.month}</div>
                <div className="text-sm text-muted-foreground">{item.properties[0]} {item.count > 1 && `+${item.count - 1} more`}</div>
              </div>
            </div>
            <Badge variant={item.count >= 4 ? 'destructive' : 'secondary'}>
              {item.count} {item.count === 1 ? 'lease' : 'leases'}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};
