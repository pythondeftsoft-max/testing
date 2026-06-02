import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface RentTrendsChartProps {
  data?: Array<{
    month: string;
    avgRent: number;
    marketRate: number;
  }>;
}

export const RentTrendsChart: React.FC<RentTrendsChartProps> = ({ data }) => {
  const mockData = data || [
    { month: 'Aug', avgRent: 1450, marketRate: 1520 },
    { month: 'Sep', avgRent: 1475, marketRate: 1535 },
    { month: 'Oct', avgRent: 1490, marketRate: 1550 },
    { month: 'Nov', avgRent: 1510, marketRate: 1565 },
    { month: 'Dec', avgRent: 1525, marketRate: 1580 },
    { month: 'Jan', avgRent: 1550, marketRate: 1600 }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Rent Trends Over Time</h3>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
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
            dataKey="avgRent" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Your Avg Rent"
          />
          <Line 
            type="monotone" 
            dataKey="marketRate" 
            stroke="hsl(var(--success))" 
            strokeWidth={2}
            name="Market Rate"
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
