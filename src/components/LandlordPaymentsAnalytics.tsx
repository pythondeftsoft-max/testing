import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, TrendingUp, Home } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface PaymentTransaction {
  id: string;
  asset_id: string;
  payer_user_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency_code: string;
  status: string;
  payment_date: string;
  created_at: string;
  portfolio_assets?: {
    asset_name: string;
    asset_value: number;
    portfolio_id: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface LandlordPaymentsAnalyticsProps {
  payments: PaymentTransaction[];
}

const chartConfig = {
  amount: {
    label: "Amount",
    color: "hsl(var(--primary))",
  },
  succeeded: {
    label: "Succeeded",
    color: "hsl(var(--success))",
  },
  pending: {
    label: "Pending", 
    color: "hsl(var(--warning))",
  },
  failed: {
    label: "Failed",
    color: "hsl(var(--destructive))",
  },
  processing: {
    label: "Processing",
    color: "hsl(var(--muted-foreground))",
  },
};

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export const LandlordPaymentsAnalytics: React.FC<LandlordPaymentsAnalyticsProps> = ({ payments }) => {
  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Current month metrics
    const currentMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });
    
    const currentMonthCollected = currentMonthPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const successfulPayments = payments.filter(p => p.status === 'succeeded');
    const successRate = payments.length > 0 ? (successfulPayments.length / payments.length) * 100 : 0;
    
    // Top property by payment volume
    const propertyPayments = payments.reduce((acc, payment) => {
      const assetName = payment.portfolio_assets?.asset_name || 'Unknown Property';
      if (!acc[assetName]) {
        acc[assetName] = { name: assetName, amount: 0, count: 0 };
      }
      if (payment.status === 'succeeded') {
        acc[assetName].amount += payment.amount;
        acc[assetName].count += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; amount: number; count: number }>);
    
    const topProperty = Object.values(propertyPayments)
      .sort((a, b) => b.amount - a.amount)[0];
    
    // Daily payment data for last 30 days
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPayments = payments.filter(p => 
        p.payment_date.startsWith(dateStr) && p.status === 'succeeded'
      );
      const dayAmount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      
      dailyData.push({
        date: date.getDate().toString(),
        amount: dayAmount,
        fullDate: dateStr
      });
    }
    
    // Status distribution
    const statusCounts = payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      label: chartConfig[status as keyof typeof chartConfig]?.label || status
    }));
    
    // Top 5 properties table
    const topProperties = Object.values(propertyPayments)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    return {
      currentMonthCollected,
      pendingAmount,
      successRate,
      topProperty,
      dailyData,
      statusData,
      topProperties
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricDisplay
          label="This Month Collected"
          value={analytics.currentMonthCollected.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          icon={<DollarSign className="h-5 w-5" />}
        />
        
        <MetricDisplay
          label="Pending Payments"
          value={analytics.pendingAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          icon={<Calendar className="h-5 w-5" />}
        />
        
        <MetricDisplay
          label="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        
        <MetricDisplay
          label="Top Property"
          value={analytics.topProperty?.name || 'No data'}
          icon={<Home className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Collections Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Collections (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={analytics.dailyData}>
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis hide />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => [
                        <CurrencyDisplay amount={Number(value)} />,
                        'Amount Collected'
                      ]}
                    />
                  } 
                />
                <Bar 
                  dataKey="amount" 
                  fill="var(--color-amount)" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({label, percent}) => `${label} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Properties Table */}
      {analytics.topProperties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Properties (Current Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProperties.map((property, index) => (
                <div key={property.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{property.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {property.count} payment{property.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <CurrencyDisplay 
                    amount={property.amount} 
                    className="font-semibold"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};