import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { debugLog } from '@/utils/debug';

interface ExpenseData {
  name: string;
  value: number;
  color: string;
}

interface ExpensePieChartProps {
  expenses: {
    mortgage: number;
    insurance: number;
    maintenance: number;
    management: number;
    taxes: number;
    other: number;
  };
  height?: number;
}

const ExpensePieChart = ({ expenses, height = 300 }: ExpensePieChartProps) => {
  const data: ExpenseData[] = [
    {
      name: 'Mortgage',
      value: expenses.mortgage,
      color: 'hsl(220, 79%, 42%)'  // Deep Blue
    },
    {
      name: 'Property Taxes',
      value: expenses.taxes,
      color: 'hsl(158, 93%, 20%)'  // Emerald Green
    },
    {
      name: 'Management',
      value: expenses.management,
      color: 'hsl(24, 87%, 48%)'   // Orange
    },
    {
      name: 'Maintenance',
      value: expenses.maintenance,
      color: 'hsl(258, 69%, 57%)'  // Purple
    },
    {
      name: 'Insurance',
      value: expenses.insurance,
      color: 'hsl(30, 88%, 45%)'   // Golden Yellow
    },
    {
      name: 'Other Expenses',
      value: expenses.other,
      color: 'hsl(347, 77%, 50%)'  // Rose Red
    }
  ].filter(item => item.value > 0);

  const totalExpenses = Object.values(expenses).reduce((sum, exp) => sum + exp, 0);

  debugLog('ExpensePieChart', 'Processing expense data', {
    expenses,
    totalExpenses,
    dataLength: data.length
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p style={{ color: data.color }} className="text-sm">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {percentage}% of total expenses
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (totalExpenses === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No expense data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Monthly Expense Breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Total Expenses: {formatCurrency(totalExpenses)}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => 
              percent > 5 ? `${(percent * 100).toFixed(0)}%` : ''
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpensePieChart;