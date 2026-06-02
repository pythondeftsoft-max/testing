import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ComposedChart } from 'recharts';
import { Clock, Target, TrendingDown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';

interface PaymentData {
  totalLatePayments: number;
  totalMissedPayments: number;
  overallCollectionRate: number;
  totalExpected: number;
  totalReceived: number;
}

interface CollectionEfficiencyProps {
  data: PaymentData | null;
  loading: boolean;
  dateRange: string;
}

export const CollectionEfficiency: React.FC<CollectionEfficiencyProps> = ({
  data,
  loading,
  dateRange
}) => {
  // Generate mock aging analysis data
  const generateAgingData = () => {
    return [
      { period: '0-30 days', amount: Math.floor(Math.random() * 5000) + 2000, count: Math.floor(Math.random() * 5) + 2 },
      { period: '31-60 days', amount: Math.floor(Math.random() * 3000) + 1000, count: Math.floor(Math.random() * 3) + 1 },
      { period: '61-90 days', amount: Math.floor(Math.random() * 2000) + 500, count: Math.floor(Math.random() * 2) + 1 },
      { period: '90+ days', amount: Math.floor(Math.random() * 1500) + 200, count: Math.floor(Math.random() * 2) },
    ];
  };

  // Generate mock collection velocity data
  const generateVelocityData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      averageDays: Math.floor(Math.random() * 10) + 15,
      collectionRate: Math.floor(Math.random() * 15) + 80,
      efficiency: Math.floor(Math.random() * 20) + 75,
    }));
  };

  const agingData = generateAgingData();
  const velocityData = generateVelocityData();

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
          <p className="text-muted-foreground">No collection efficiency data available</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const collectionEfficiencyScore = data.overallCollectionRate;
  const totalOutstanding = data.totalExpected - data.totalReceived;
  const avgCollectionTime = Math.floor(Math.random() * 15) + 10; // Mock data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Collection Performance Metrics */}
      <CardEnhanced className="bg-white border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Target className="h-5 w-5" />
            Collection Performance
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-6">
            {/* Overall Efficiency Score */}
            <div className="text-center">
              <div className="text-3xl font-bold text-openkey-blue mb-2">
                {collectionEfficiencyScore.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mb-3">Collection Efficiency</div>
              <Progress value={collectionEfficiencyScore} className="h-2" />
              <Badge 
                variant={collectionEfficiencyScore >= 95 ? "default" : collectionEfficiencyScore >= 85 ? "secondary" : "destructive"} 
                className="mt-2"
              >
                {collectionEfficiencyScore >= 95 ? "Excellent" : collectionEfficiencyScore >= 85 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-blue-800">Avg Collection Time</div>
                  <div className="text-xs text-blue-600">Days to collect payment</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-800">{avgCollectionTime}</div>
                  <div className="text-xs text-blue-600">days</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-orange-800">Outstanding Balance</div>
                  <div className="text-xs text-orange-600">Total amount overdue</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-800">{formatCurrency(totalOutstanding)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-red-800">Problem Accounts</div>
                  <div className="text-xs text-red-600">Late + missed payments</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-800">{data.totalLatePayments + data.totalMissedPayments}</div>
                </div>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Aging Analysis */}
      <CardEnhanced className="bg-white border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Clock className="h-5 w-5" />
            Aging Analysis
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} layout="horizontal">
                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <YAxis dataKey="period" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'amount' ? formatCurrency(value as number) : value,
                    name === 'amount' ? 'Outstanding' : 'Count'
                  ]}
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--openkey-blue))" 
                  opacity={0.8}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-openkey-blue">Aging Summary</h4>
            {agingData.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className={index >= 2 ? "text-red-600" : "text-muted-foreground"}>
                  {item.period}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                  <Badge variant="outline">
                    {item.count} accounts
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Collection Velocity Trends */}
      <CardEnhanced className="bg-white border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <TrendingDown className="h-5 w-5" />
            Collection Velocity
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={velocityData}>
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'averageDays' ? `${value} days` : `${value}%`,
                    name === 'averageDays' ? 'Avg Days' : 
                    name === 'collectionRate' ? 'Collection Rate' : 'Efficiency'
                  ]}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="averageDays" 
                  fill="hsl(var(--openkey-gold))" 
                  opacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--openkey-blue))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--openkey-blue))', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Collection Insights */}
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-green-800">Top Performing</div>
              </div>
              <div className="text-xs text-green-700">
                HAP payments show 98% reliability with 15-day average collection time
              </div>
            </div>

            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="text-sm font-medium text-orange-800">Attention Needed</div>
              </div>
              <div className="text-xs text-orange-700">
                {data.totalLatePayments} accounts require follow-up for late payments
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Collection Tips</div>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Set up automated payment reminders</li>
                <li>• Offer multiple payment methods</li>
                <li>• Implement early payment incentives</li>
              </ul>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};