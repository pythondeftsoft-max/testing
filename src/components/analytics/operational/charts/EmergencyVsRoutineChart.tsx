import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
  { name: 'Emergency', value: 28, color: 'hsl(var(--destructive))' },
  { name: 'Urgent', value: 35, color: 'hsl(var(--warning))' },
  { name: 'Routine', value: 92, color: 'hsl(var(--primary))' },
  { name: 'Preventive', value: 65, color: 'hsl(var(--accent))' },
];

export const EmergencyVsRoutineChart: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Maintenance by Priority</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={mockData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {mockData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
