import React from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { week: 'Week 1', requests: 45, completed: 38 },
  { week: 'Week 2', requests: 52, completed: 48 },
  { week: 'Week 3', requests: 48, completed: 45 },
  { week: 'Week 4', requests: 55, completed: 52 },
];

export const MaintenanceRequestTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Request Volume Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Area type="monotone" dataKey="requests" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" name="Requests" />
          <Area type="monotone" dataKey="completed" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.3)" name="Completed" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
