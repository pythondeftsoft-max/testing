import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Layers, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';

interface PaymentData {
  hapTotalReceived: number;
  tenantTotalReceived: number;
  totalReceived: number;
  currentMonthReceived: number;
}

interface RevenueSourcesBreakdownProps {
  data: PaymentData | null;
  loading: boolean;
  dateRange: string;
}

export const RevenueSourcesBreakdown: React.FC<RevenueSourcesBreakdownProps> = ({
  data,
  loading,
  dateRange
}) => {
  // Generate mock revenue trend data
  const generateRevenueTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      rent: Math.floor(Math.random() * 30000) + 40000,
      hap: Math.floor(Math.random() * 20000) + 25000,
      fees: Math.floor(Math.random() * 5000) + 2000,
      other: Math.floor(Math.random() * 3000) + 1000,
    }));
  };

  // Generate mock additional revenue sources
  const generateAdditionalRevenue = () => {
    const lateFees = Math.floor(Math.random() * 2000) + 1000;
    const petFees = Math.floor(Math.random() * 1500) + 800;
    const parkingFees = Math.floor(Math.random() * 1000) + 500;
    const utilityCharges = Math.floor(Math.random() * 3000) + 2000;
    
    return { lateFees, petFees, parkingFees, utilityCharges };
  };

  const trendData = generateRevenueTrendData();
  const additionalRevenue = generateAdditionalRevenue();

  // Revenue sources breakdown
  const revenueBreakdown = data ? [
    { 
      name: 'Tenant Payments', 
      value: data.tenantTotalReceived, 
      color: 'hsl(var(--openkey-blue))',
      percentage: ((data.tenantTotalReceived / data.totalReceived) * 100).toFixed(1)
    },
    { 
      name: 'HAP Payments', 
      value: data.hapTotalReceived, 
      color: 'hsl(var(--openkey-gold))',
      percentage: ((data.hapTotalReceived / data.totalReceived) * 100).toFixed(1)
    },
    { 
      name: 'Late Fees', 
      value: additionalRevenue.lateFees, 
      color: 'hsl(220, 70%, 70%)',
      percentage: ((additionalRevenue.lateFees / (data.totalReceived + additionalRevenue.lateFees + additionalRevenue.petFees + additionalRevenue.parkingFees + additionalRevenue.utilityCharges)) * 100).toFixed(1)
    },
    { 
      name: 'Other Fees', 
      value: additionalRevenue.petFees + additionalRevenue.parkingFees + additionalRevenue.utilityCharges, 
      color: 'hsl(280, 70%, 70%)',
      percentage: (((additionalRevenue.petFees + additionalRevenue.parkingFees + additionalRevenue.utilityCharges) / (data.totalReceived + additionalRevenue.lateFees + additionalRevenue.petFees + additionalRevenue.parkingFees + additionalRevenue.utilityCharges)) * 100).toFixed(1)
    }
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

  if (!data) {
    return (
      <CardEnhanced>
        <CardEnhancedContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No revenue data available</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const totalRevenueWithFees = data.totalReceived + additionalRevenue.lateFees + additionalRevenue.petFees + additionalRevenue.parkingFees + additionalRevenue.utilityCharges;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Mix Overview */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Layers className="h-5 w-5" />
            Revenue Mix
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Revenue breakdown legend */}
          <div className="mt-4 space-y-2">
            {revenueBreakdown.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm">{entry.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(entry.value)}</div>
                  <div className="text-xs text-muted-foreground">{entry.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Revenue Trends */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <TrendingUp className="h-5 w-5" />
            Revenue Trends
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(value as number),
                    name === 'rent' ? 'Base Rent' :
                    name === 'hap' ? 'HAP Payments' :
                    name === 'fees' ? 'Fees' : 'Other'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="rent"
                  stackId="1"
                  stroke="hsl(var(--openkey-blue))"
                  fill="hsl(var(--openkey-blue))"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="hap"
                  stackId="1"
                  stroke="hsl(var(--openkey-gold))"
                  fill="hsl(var(--openkey-gold))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="fees"
                  stackId="1"
                  stroke="hsl(220, 70%, 70%)"
                  fill="hsl(220, 70%, 70%)"
                  fillOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="other"
                  stackId="1"
                  stroke="hsl(280, 70%, 70%)"
                  fill="hsl(280, 70%, 70%)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Revenue Optimization */}
      <CardEnhanced className="bg-card border-openkey-blue/20">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Target className="h-5 w-5" />
            Revenue Optimization
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            {/* Total Revenue */}
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalRevenueWithFees)}
              </div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>

            {/* Additional Revenue Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-openkey-blue">Additional Revenue Sources</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="text-sm">Late Fees</span>
                  <span className="font-semibold">{formatCurrency(additionalRevenue.lateFees)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="text-sm">Pet Fees</span>
                  <span className="font-semibold">{formatCurrency(additionalRevenue.petFees)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="text-sm">Parking Fees</span>
                  <span className="font-semibold">{formatCurrency(additionalRevenue.parkingFees)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="text-sm">Utility Charges</span>
                  <span className="font-semibold">{formatCurrency(additionalRevenue.utilityCharges)}</span>
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
            <div className="p-3 bg-openkey-gold/10 rounded-lg">
              <div className="text-sm font-medium text-openkey-gold mb-2">Optimization Opportunities</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Review utility charges for cost recovery</li>
                <li>• Consider pet deposit vs monthly fees</li>
                <li>• Implement late fee collection automation</li>
              </ul>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};