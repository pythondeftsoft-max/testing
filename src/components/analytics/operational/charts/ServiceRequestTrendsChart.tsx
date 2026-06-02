import React from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', requests: 125, fulfilled: 118 },
  { month: 'Feb', requests: 135, fulfilled: 130 },
  { month: 'Mar', requests: 128, fulfilled: 125 },
  { month: 'Apr', requests: 142, fulfilled: 138 },
  { month: 'May', requests: 138, fulfilled: 135 },
  { month: 'Jun', requests: 145, fulfilled: 142 },
];

export const ServiceRequestTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Service Request Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={mockData}>
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
          <Area type="monotone" dataKey="requests" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" name="Total Requests" />
          <Area type="monotone" dataKey="fulfilled" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.3)" name="Fulfilled" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
