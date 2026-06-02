import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';

const mockData = [
  { month: 'Jan', riskScore: 72, upperBound: 75, lowerBound: 69 },
  { month: 'Feb', riskScore: 74, upperBound: 77, lowerBound: 71 },
  { month: 'Mar', riskScore: 76, upperBound: 79, lowerBound: 73 },
  { month: 'Apr', riskScore: 78, upperBound: 81, lowerBound: 75 },
  { month: 'May', riskScore: 79, upperBound: 82, lowerBound: 76 },
  { month: 'Jun', riskScore: 81, upperBound: 84, lowerBound: 78 },
  { month: 'Jul', riskScore: 82, upperBound: 85, lowerBound: 79 },
  { month: 'Aug', riskScore: 83, upperBound: 86, lowerBound: 80 },
  { month: 'Sep', riskScore: 84, upperBound: 87, lowerBound: 81 },
  { month: 'Oct', riskScore: 85, upperBound: 88, lowerBound: 82 },
  { month: 'Nov', riskScore: 85, upperBound: 88, lowerBound: 82 },
  { month: 'Dec', riskScore: 85, upperBound: 88, lowerBound: 82 },
];

export const RiskScoreTimelineChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Risk Score Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis domain={[65, 90]} className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="hsl(var(--primary) / 0.1)"
            name="Confidence Range"
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="hsl(var(--background))"
          />
          <Line 
            type="monotone" 
            dataKey="riskScore" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            name="Risk Assessment Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
