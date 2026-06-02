import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { vendor: 'Vendor A', utilization: 85, capacity: 100 },
  { vendor: 'Vendor B', utilization: 72, capacity: 100 },
  { vendor: 'Vendor C', utilization: 68, capacity: 100 },
  { vendor: 'Vendor D', utilization: 91, capacity: 100 },
  { vendor: 'Vendor E', utilization: 78, capacity: 100 },
];

export const VendorUtilizationChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Vendor Utilization</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="vendor" className="text-xs" />
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
          <Bar dataKey="utilization" fill="hsl(var(--primary))" name="Utilization %" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
