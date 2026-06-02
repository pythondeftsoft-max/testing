import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { category: 'HVAC', count: 45, cost: 12500 },
  { category: 'Plumbing', count: 38, cost: 9800 },
  { category: 'Electrical', count: 32, cost: 8500 },
  { category: 'Landscaping', count: 28, cost: 5200 },
  { category: 'Structural', count: 15, cost: 18000 },
];

export const CategoryBreakdownChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Maintenance by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="category" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="count" fill="hsl(var(--primary))" name="Request Count" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
