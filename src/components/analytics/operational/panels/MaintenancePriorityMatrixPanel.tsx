import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockTasks = {
  urgentImportant: [
    { task: 'Property C HVAC Failure', property: 'Property C' },
    { task: 'Electrical Panel Inspection', property: 'Property A' },
  ],
  urgentNotImportant: [
    { task: 'Landscaping Touch-up', property: 'Property B' },
    { task: 'Paint Touch-up Lobby', property: 'Property D' },
  ],
  notUrgentImportant: [
    { task: 'Annual Fire Safety Audit', property: 'All' },
    { task: 'Roof Inspection', property: 'Property E' },
  ],
  notUrgentNotImportant: [
    { task: 'Update Signage', property: 'Property A' },
    { task: 'Refresh Common Areas', property: 'Property C' },
  ],
};

export const MaintenancePriorityMatrixPanel: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Priority Matrix</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Urgent & Important */}
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="destructive">Do First</Badge>
            Urgent & Important
          </h4>
          <div className="space-y-2">
            {mockTasks.urgentImportant.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-background/50 rounded">
                <p className="font-medium">{item.task}</p>
                <p className="text-muted-foreground text-xs">{item.property}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Not Urgent but Important */}
        <Card className="p-4 bg-primary/10 border-primary/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">Schedule</Badge>
            Not Urgent, Important
          </h4>
          <div className="space-y-2">
            {mockTasks.notUrgentImportant.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-background/50 rounded">
                <p className="font-medium">{item.task}</p>
                <p className="text-muted-foreground text-xs">{item.property}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Urgent but Not Important */}
        <Card className="p-4 bg-accent/10 border-accent/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="secondary">Delegate</Badge>
            Urgent, Not Important
          </h4>
          <div className="space-y-2">
            {mockTasks.urgentNotImportant.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-background/50 rounded">
                <p className="font-medium">{item.task}</p>
                <p className="text-muted-foreground text-xs">{item.property}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Not Urgent & Not Important */}
        <Card className="p-4 bg-muted/30">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="outline">Later</Badge>
            Not Urgent, Not Important
          </h4>
          <div className="space-y-2">
            {mockTasks.notUrgentNotImportant.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-background/50 rounded">
                <p className="font-medium">{item.task}</p>
                <p className="text-muted-foreground text-xs">{item.property}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Card>
  );
};
