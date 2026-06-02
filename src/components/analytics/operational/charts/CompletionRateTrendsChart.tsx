import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', rate: 82, target: 85 },
  { month: 'Feb', rate: 84, target: 85 },
  { month: 'Mar', rate: 86, target: 85 },
  { month: 'Apr', rate: 88, target: 85 },
  { month: 'May', rate: 90, target: 85 },
  { month: 'Jun', rate: 92, target: 85 },
];

export const CompletionRateTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Completion Rate Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis domain={[75, 100]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value) => `${value}%`}
          />
          <Legend />
          <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} name="Completion Rate" />
          <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Target" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
