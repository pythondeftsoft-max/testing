import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { quarter: 'Q1 2024', incidents: 2.5, industry: 3.2 },
  { quarter: 'Q2 2024', incidents: 2.2, industry: 3.1 },
  { quarter: 'Q3 2024', incidents: 1.8, industry: 3.0 },
  { quarter: 'Q4 2024', incidents: 1.5, industry: 2.9 },
  { quarter: 'Q1 2025', incidents: 1.3, industry: 2.8 },
  { quarter: 'Q2 2025', incidents: 1.0, industry: 2.7 },
];

export const IncidentRateTrendChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Incident Rate Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="quarter" className="text-xs" />
          <YAxis domain={[0, 4]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value) => `${value}%`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="incidents" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Portfolio Incident Rate"
          />
          <Line 
            type="monotone" 
            dataKey="industry" 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            name="Industry Average"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
