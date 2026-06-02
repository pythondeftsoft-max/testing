import React from 'react';
import { DollarSign, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import AnalyticsWidget from './AnalyticsWidget';

interface FinancialData {
  total_rent_due: number;
  total_rent_collected: number;
  on_time_collection_rate: number;
  total_late_fees: number;
  late_payment_count: number;
  avg_payment_delay: number;
}

interface FinancialMetricsProps {
  data: FinancialData | null;
  loading: boolean;
}

const FinancialMetrics = ({ data, loading }: FinancialMetricsProps) => {
  // Pie chart data for on-time vs late payments
  const paymentStatusData = [
    { 
      name: 'On Time', 
      value: data?.on_time_collection_rate || 0,
      color: 'hsl(var(--primary))'
    },
    { 
      name: 'Late', 
      value: 100 - (data?.on_time_collection_rate || 0),
      color: 'hsl(var(--destructive))'
    }
  ];

  // Mock data for top late-paying properties
  const latePaymentProperties = [
    { property: '123 Main St', amount: 1200, days: 15 },
    { property: '456 Oak Ave', amount: 950, days: 12 },
    { property: '789 Pine Rd', amount: 1400, days: 8 },
    { property: '321 Elm St', amount: 800, days: 5 },
    { property: '654 Maple Dr', amount: 1100, days: 3 },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Financial & Payment Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsWidget
          title="Collection Rate"
          description="% of rent collected on time"
          value={`${Math.round(data?.on_time_collection_rate || 0)}%`}
          trend={{
            value: 2,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={DollarSign}
          status={data?.on_time_collection_rate && data.on_time_collection_rate > 90 ? 'good' : 'warning'}
        />

        <AnalyticsWidget
          title="Total Collected"
          description="Rent payments received"
          value={`$${(data?.total_rent_collected || 0).toLocaleString()}`}
          icon={DollarSign}
          status="good"
        />

        <AnalyticsWidget
          title="Late Fees"
          description="Total late fees assessed"
          value={`$${(data?.total_late_fees || 0).toLocaleString()}`}
          icon={AlertTriangle}
          status={data?.total_late_fees && data.total_late_fees > 0 ? 'warning' : 'good'}
        />

        <AnalyticsWidget
          title="Avg Payment Delay"
          description="Days late for late payments"
          value={`${Math.round(data?.avg_payment_delay || 0)} days`}
          trend={{
            value: 8,
            direction: 'down',
            label: 'vs last month'
          }}
          icon={Clock}
          status={data?.avg_payment_delay && data.avg_payment_delay < 10 ? 'good' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Pie Chart */}
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-4">Payment Status Breakdown</h4>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>On Time ({Math.round(data?.on_time_collection_rate || 0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Late ({Math.round(100 - (data?.on_time_collection_rate || 0))}%)</span>
            </div>
          </div>
        </div>

        {/* Top Late-Paying Properties */}
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-4">Top Late-Paying Properties</h4>
          <div className="space-y-3">
            {latePaymentProperties.map((property, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div>
                  <div className="font-medium text-sm">{property.property}</div>
                  <div className="text-xs text-muted-foreground">{property.days} days late</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${property.amount.toLocaleString()}</div>
                  <div className="text-xs text-destructive">Outstanding</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Rent Due</div>
          <div className="text-2xl font-bold">${(data?.total_rent_due || 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Expected this period</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Late Payment Count</div>
          <div className="text-2xl font-bold">{data?.late_payment_count || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Properties with late payments</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Collection Efficiency</div>
          <div className="text-2xl font-bold">
            {data?.total_rent_due && data?.total_rent_collected 
              ? Math.round((data.total_rent_collected / data.total_rent_due) * 100)
              : 0}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Of expected rent collected</div>
        </div>
      </div>
    </div>
  );
};

export default FinancialMetrics;