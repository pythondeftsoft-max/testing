import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', emergency: 2.5, urgent: 8, routine: 48 },
  { month: 'Feb', emergency: 2.2, urgent: 7.5, routine: 45 },
  { month: 'Mar', emergency: 2.0, urgent: 7, routine: 42 },
  { month: 'Apr', emergency: 1.8, urgent: 6.5, routine: 38 },
  { month: 'May', emergency: 1.5, urgent: 6, routine: 35 },
  { month: 'Jun', emergency: 1.3, urgent: 5.5, routine: 32 },
];

export const ResponseTimeTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Response Time Improvements</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value) => `${value} hrs`}
          />
          <Legend />
          <Line type="monotone" dataKey="emergency" stroke="hsl(var(--destructive))" strokeWidth={2} name="Emergency" />
          <Line type="monotone" dataKey="urgent" stroke="hsl(var(--warning))" strokeWidth={2} name="Urgent" />
          <Line type="monotone" dataKey="routine" stroke="hsl(var(--primary))" strokeWidth={2} name="Routine" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
