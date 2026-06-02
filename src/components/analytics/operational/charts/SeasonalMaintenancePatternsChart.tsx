import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', hvac: 55, plumbing: 32, electrical: 28, landscaping: 12 },
  { month: 'Feb', hvac: 52, plumbing: 35, electrical: 30, landscaping: 15 },
  { month: 'Mar', hvac: 48, plumbing: 38, electrical: 32, landscaping: 25 },
  { month: 'Apr', hvac: 45, plumbing: 42, electrical: 35, landscaping: 38 },
  { month: 'May', hvac: 42, plumbing: 45, electrical: 38, landscaping: 48 },
  { month: 'Jun', hvac: 58, plumbing: 48, electrical: 42, landscaping: 52 },
];

export const SeasonalMaintenancePatternsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Seasonal Maintenance Patterns</h3>
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
          <Line type="monotone" dataKey="hvac" stroke="hsl(var(--primary))" strokeWidth={2} name="HVAC" />
          <Line type="monotone" dataKey="plumbing" stroke="hsl(var(--accent))" strokeWidth={2} name="Plumbing" />
          <Line type="monotone" dataKey="electrical" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Electrical" />
          <Line type="monotone" dataKey="landscaping" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Landscaping" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
