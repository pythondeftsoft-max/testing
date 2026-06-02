import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', backlog: 45, resolved: 38 },
  { month: 'Feb', backlog: 48, resolved: 42 },
  { month: 'Mar', backlog: 42, resolved: 45 },
  { month: 'Apr', backlog: 38, resolved: 48 },
  { month: 'May', backlog: 35, resolved: 52 },
  { month: 'Jun', backlog: 32, resolved: 55 },
];

export const MaintenanceBacklogTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Maintenance Backlog Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="backlog" stroke="hsl(var(--destructive))" strokeWidth={2} name="Backlog Items" />
          <Line type="monotone" dataKey="resolved" stroke="hsl(var(--primary))" strokeWidth={2} name="Resolved Items" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
