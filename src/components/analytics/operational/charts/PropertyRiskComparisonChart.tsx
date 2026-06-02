import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

const mockData = [
  { property: 'Property A', riskScore: 92, status: 'low' },
  { property: 'Property B', riskScore: 88, status: 'low' },
  { property: 'Property C', riskScore: 85, status: 'medium' },
  { property: 'Property D', riskScore: 82, status: 'medium' },
  { property: 'Property E', riskScore: 78, status: 'medium' },
  { property: 'Property F', riskScore: 74, status: 'high' },
  { property: 'Property G', riskScore: 70, status: 'high' },
  { property: 'Property H', riskScore: 65, status: 'high' },
];

export const PropertyRiskComparisonChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Property Risk Comparison</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" domain={[0, 100]} className="text-xs" />
          <YAxis dataKey="property" type="category" className="text-xs" width={80} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <ReferenceLine x={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="Target" />
          <Bar 
            dataKey="riskScore" 
            fill="hsl(var(--primary))" 
            name="Risk Score"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
