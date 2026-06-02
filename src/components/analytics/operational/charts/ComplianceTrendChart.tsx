import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', compliance: 85, target: 90 },
  { month: 'Feb', compliance: 87, target: 90 },
  { month: 'Mar', compliance: 89, target: 90 },
  { month: 'Apr', compliance: 91, target: 90 },
  { month: 'May', compliance: 90, target: 90 },
  { month: 'Jun', compliance: 92, target: 90 },
  { month: 'Jul', compliance: 93, target: 90 },
  { month: 'Aug', compliance: 94, target: 90 },
  { month: 'Sep', compliance: 93, target: 90 },
  { month: 'Oct', compliance: 95, target: 90 },
  { month: 'Nov', compliance: 94, target: 90 },
  { month: 'Dec', compliance: 95, target: 90 },
];

export const ComplianceTrendChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis domain={[80, 100]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="compliance" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Compliance Rate (%)"
          />
          <Line 
            type="monotone" 
            dataKey="target" 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            name="Target (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
