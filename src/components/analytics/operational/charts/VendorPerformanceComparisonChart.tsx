import React from 'react';
import { Card } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const mockData = [
  { metric: 'Quality', vendorA: 90, vendorB: 85, vendorC: 78 },
  { metric: 'Timeliness', vendorA: 88, vendorB: 92, vendorC: 80 },
  { metric: 'Cost', vendorA: 75, vendorB: 82, vendorC: 95 },
  { metric: 'Communication', vendorA: 92, vendorB: 88, vendorC: 85 },
  { metric: 'Reliability', vendorA: 95, vendorB: 90, vendorC: 82 },
];

export const VendorPerformanceComparisonChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Vendor Performance Comparison</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={mockData}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis dataKey="metric" className="text-xs" />
          <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Radar name="Vendor A" dataKey="vendorA" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          <Radar name="Vendor B" dataKey="vendorB" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
          <Radar name="Vendor C" dataKey="vendorC" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
};
