import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { category: 'HVAC', actual: 12500, budget: 15000 },
  { category: 'Plumbing', actual: 9800, budget: 10000 },
  { category: 'Electrical', actual: 8500, budget: 8000 },
  { category: 'Landscaping', actual: 5200, budget: 6000 },
  { category: 'Structural', actual: 18000, budget: 16000 },
];

export const CostVsBudgetAnalysisChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Cost vs Budget Analysis</h3>
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
            formatter={(value) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual Cost" radius={[8, 8, 0, 0]} />
          <Bar dataKey="budget" fill="hsl(var(--muted-foreground))" name="Budget" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
