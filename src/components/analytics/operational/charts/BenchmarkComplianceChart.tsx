import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { category: 'Safety Inspections', portfolio: 95, industry: 78, target: 90 },
  { category: 'Code Compliance', portfolio: 92, industry: 82, target: 90 },
  { category: 'Environmental', portfolio: 88, industry: 75, target: 85 },
  { category: 'Accessibility', portfolio: 90, industry: 80, target: 90 },
  { category: 'Fire Safety', portfolio: 94, industry: 85, target: 95 },
  { category: 'Insurance', portfolio: 96, industry: 88, target: 95 },
];

export const BenchmarkComplianceChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Benchmark Compliance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="category" className="text-xs" angle={-45} textAnchor="end" height={80} />
          <YAxis domain={[0, 100]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value) => `${value}%`}
          />
          <Legend />
          <Bar dataKey="portfolio" fill="hsl(var(--primary))" name="Portfolio" radius={[8, 8, 0, 0]} />
          <Bar dataKey="industry" fill="hsl(var(--muted-foreground))" name="Industry Average" radius={[8, 8, 0, 0]} />
          <Bar dataKey="target" fill="hsl(var(--accent))" name="Target" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
