import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { Building, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';

interface PaymentData {
  hapTotalExpected: number;
  hapTotalReceived: number;
  hapCurrentMonthExpected: number;
  hapCurrentMonthReceived: number;
  hapLatePayments: number;
  hapMissedPayments: number;
  hapCollectionRate: number;
  propertiesWithVouchers: number;
}

interface HAPPaymentTrackingProps {
  data: PaymentData | null;
  loading: boolean;
  dateRange: string;
}

export const HAPPaymentTracking: React.FC<HAPPaymentTrackingProps> = ({
  data,
  loading,
  dateRange
}) => {
  // Generate mock HAP reliability data
  const generateHAPReliabilityData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      received: Math.floor(Math.random() * 30000) + 40000,
      expected: Math.floor(Math.random() * 5000) + 45000,
      reliability: Math.floor(Math.random() * 15) + 85,
    }));
  };

  const reliabilityData = generateHAPReliabilityData();

  // HAP vs Tenant payment distribution
  const paymentDistribution = data ? [
    { name: 'HAP Payments', value: data.hapTotalReceived, color: 'hsl(var(--openkey-blue))' },
    { name: 'Tenant Portion', value: data.hapTotalExpected - data.hapTotalReceived, color: 'hsl(var(--openkey-gold))' }
  ] : [];

  if (loading) {
    return (
      <CardEnhanced className="animate-pulse">
        <CardEnhancedContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!data || data.propertiesWithVouchers === 0) {
    return (
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No HAP payment data available</p>
            <p className="text-sm text-muted-foreground mt-2">Properties with housing vouchers will appear here</p>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const hapReliabilityScore = data.hapCollectionRate;
  const avgProcessingTime = Math.floor(Math.random() * 5) + 15; // Mock data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* HAP Performance Overview */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Shield className="h-5 w-5" />
            HAP Performance
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-openkey-blue">
                {hapReliabilityScore.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Payment Reliability</div>
              <Badge variant={hapReliabilityScore >= 95 ? "default" : hapReliabilityScore >= 85 ? "secondary" : "destructive"} className="mt-1">
                {hapReliabilityScore >= 95 ? "Excellent" : hapReliabilityScore >= 85 ? "Good" : "Needs Review"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Properties with Vouchers</span>
                <span className="font-semibold">{data.propertiesWithVouchers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expected This Month</span>
                <span className="font-semibold">{formatCurrency(data.hapCurrentMonthExpected)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Received This Month</span>
                <span className="font-semibold text-green-600">{formatCurrency(data.hapCurrentMonthReceived)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg Processing Time</span>
                <span className="font-semibold">{avgProcessingTime} days</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Government Backed</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Reliable payment source</div>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* HAP Payment Distribution */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Building className="h-5 w-5" />
            Payment Distribution
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {paymentDistribution.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm">{entry.name}</span>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* HAP Reliability Trends */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <CheckCircle className="h-5 w-5" />
            Reliability Trends
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reliabilityData}>
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'reliability' ? `${value}%` : formatCurrency(value as number),
                    name === 'reliability' ? 'Reliability' : 
                    name === 'received' ? 'Received' : 'Expected'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="reliability"
                  stroke="hsl(var(--openkey-blue))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--openkey-blue))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium text-foreground">HAP Insights</div>
                <div className="text-muted-foreground">Consistent government payments provide stable cash flow</div>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};