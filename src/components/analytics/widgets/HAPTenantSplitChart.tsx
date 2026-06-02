import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign } from 'lucide-react';
import { useHAPAnalytics } from '@/hooks/useHAPAnalytics';
import { debugLog } from '@/utils/debug';

interface HAPTenantSplitChartProps {
  landlordId: string;
}

const COLORS = {
  hap: 'hsl(var(--primary))',
  tenant: 'hsl(var(--secondary))'
};

export const HAPTenantSplitChart = ({ landlordId }: HAPTenantSplitChartProps) => {
  const { data: hapData, loading } = useHAPAnalytics(landlordId);

  debugLog('HAPTenantSplitChart', 'Received HAP data', {
    hapData,
    loading,
    landlordId
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hapData || hapData.totalExpected === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No payment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = [
    {
      name: 'HAP Payments',
      value: hapData.hapPayments || 0,
      color: COLORS.hap,
      percentage: hapData.totalExpected > 0 ? ((hapData.hapPayments || 0) / hapData.totalExpected * 100) : 0
    },
    {
      name: 'Tenant Payments', 
      value: hapData.tenantPayments || 0,
      color: COLORS.tenant,
      percentage: hapData.totalExpected > 0 ? ((hapData.tenantPayments || 0) / hapData.totalExpected * 100) : 0
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = hapData.totalExpected > 0 ? (value / hapData.totalExpected * 100) : 0;

    // Only show label if percentage is significant enough
    if (percentage < 5) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Sources
        </CardTitle>
      </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={100}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(hapData.totalExpected)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Expected
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div className="text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-1">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};