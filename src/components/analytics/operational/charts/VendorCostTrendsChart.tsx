import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', vendorA: 15000, vendorB: 12000, vendorC: 8500 },
  { month: 'Feb', vendorA: 16500, vendorB: 11500, vendorC: 9000 },
  { month: 'Mar', vendorA: 14500, vendorB: 13000, vendorC: 8800 },
  { month: 'Apr', vendorA: 17000, vendorB: 12500, vendorC: 9200 },
  { month: 'May', vendorA: 15500, vendorB: 14000, vendorC: 8600 },
  { month: 'Jun', vendorA: 16000, vendorB: 13500, vendorC: 9500 },
];

export const VendorCostTrendsChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Vendor Cost Trends</h3>
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
            formatter={(value) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Line type="monotone" dataKey="vendorA" stroke="hsl(var(--primary))" strokeWidth={2} name="Vendor A" />
          <Line type="monotone" dataKey="vendorB" stroke="hsl(var(--accent))" strokeWidth={2} name="Vendor B" />
          <Line type="monotone" dataKey="vendorC" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Vendor C" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
