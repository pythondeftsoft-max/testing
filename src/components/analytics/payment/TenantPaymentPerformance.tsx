import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';

interface PaymentData {
  tenantTotalExpected: number;
  tenantTotalReceived: number;
  tenantCurrentMonthExpected: number;
  tenantCurrentMonthReceived: number;
  tenantLatePayments: number;
  tenantMissedPayments: number;
  tenantCollectionRate: number;
}

interface TenantPaymentPerformanceProps {
  data: PaymentData | null;
  loading: boolean;
  dateRange: string;
}

export const TenantPaymentPerformance: React.FC<TenantPaymentPerformanceProps> = ({
  data,
  loading,
  dateRange
}) => {
  // Generate mock trend data for visualization
  const generateTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      collected: Math.floor(Math.random() * 50000) + 30000,
      expected: Math.floor(Math.random() * 10000) + 35000,
      onTime: Math.floor(Math.random() * 30) + 70,
    }));
  };

  const trendData = generateTrendData();

  if (loading) {
    return (
      <CardEnhanced className="animate-pulse">
        <CardEnhancedContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!data) {
    return (
      <CardEnhanced>
        <CardEnhancedContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No tenant payment data available</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const onTimeRate = data.tenantCollectionRate;
  const avgPaymentDelay = Math.floor(Math.random() * 5) + 2; // Mock data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Collection Performance Metrics */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Users className="h-5 w-5" />
            Tenant Payment Performance
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-openkey-blue">
                  {onTimeRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Collection Rate</div>
                <Badge variant={onTimeRate >= 90 ? "default" : onTimeRate >= 75 ? "secondary" : "destructive"} className="mt-1">
                  {onTimeRate >= 90 ? "Excellent" : onTimeRate >= 75 ? "Good" : "Needs Attention"}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-openkey-gold/10 rounded-lg">
                <div className="text-2xl font-bold text-openkey-gold">
                  {avgPaymentDelay}
                </div>
                <div className="text-sm text-muted-foreground">Avg Days Delay</div>
                <Badge variant={avgPaymentDelay <= 3 ? "default" : avgPaymentDelay <= 7 ? "secondary" : "destructive"} className="mt-1">
                  {avgPaymentDelay <= 3 ? "Excellent" : avgPaymentDelay <= 7 ? "Acceptable" : "Poor"}
                </Badge>
              </div>
            </div>

            {/* Payment Status Summary */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expected This Month</span>
                <span className="font-semibold">{formatCurrency(data.tenantCurrentMonthExpected)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Collected This Month</span>
                <span className="font-semibold text-green-600">{formatCurrency(data.tenantCurrentMonthReceived)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">Late Payments</span>
                <span className="font-semibold text-orange-600">{data.tenantLatePayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-600">Missed Payments</span>
                <span className="font-semibold text-red-600">{data.tenantMissedPayments}</span>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Payment Trends Chart */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <TrendingUp className="h-5 w-5" />
            Payment Trends
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'collected' ? formatCurrency(value as number) : 
                    name === 'expected' ? formatCurrency(value as number) : 
                    `${value}%`,
                    name === 'collected' ? 'Collected' : 
                    name === 'expected' ? 'Expected' : 
                    'On-Time Rate'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stackId="1"
                  stroke="hsl(var(--openkey-blue))"
                  fill="hsl(var(--openkey-blue))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stackId="2"
                  stroke="hsl(var(--openkey-gold))"
                  fill="hsl(var(--openkey-gold))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};