import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Wrench } from 'lucide-react';

const mockProperties = [
  { name: 'Property A', requests: 45, avgResponse: 2.5, completion: 92, cost: 15000 },
  { name: 'Property B', requests: 38, avgResponse: 2.8, completion: 88, cost: 12500 },
  { name: 'Property C', requests: 52, avgResponse: 3.2, completion: 85, cost: 18000 },
  { name: 'Property D', requests: 32, avgResponse: 2.2, completion: 95, cost: 9800 },
  { name: 'Property E', requests: 41, avgResponse: 2.6, completion: 90, cost: 13500 },
];

export const PropertyMaintenanceComparisonPanel: React.FC = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Property Maintenance Comparison</h3>
        <Badge variant="outline">{mockProperties.length} Properties</Badge>
      </div>

      <div className="space-y-3">
        {mockProperties.map((property, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{property.name}</span>
              </div>
              <Badge variant={property.completion >= 90 ? 'default' : 'secondary'}>
                {property.completion}% Complete
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Requests</p>
                <p className="font-medium">{property.requests}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Response</p>
                <p className="font-medium">{property.avgResponse}h</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost</p>
                <p className="font-medium">${(property.cost / 1000).toFixed(1)}K</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
