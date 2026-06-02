import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { usePortfolioProperties } from '@/hooks/usePortfolioFinancialData';
import { usePortfolioBalanceSheet } from '@/hooks/usePortfolioFinancialData';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, Building, TrendingUp, PieChart, Target } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';

interface InvestmentMetricsProps {
  landlordId: string;
  portfolioId: string;
}

export const InvestmentMetrics: React.FC<InvestmentMetricsProps> = ({
  landlordId,
  portfolioId,
}) => {
  const asOfDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const { data: propertiesData, isLoading: propLoading, error: propError } = usePortfolioProperties(portfolioId);
  const { data: balanceSheetData, isLoading: bsLoading } = usePortfolioBalanceSheet(portfolioId, asOfDate);

  const isLoading = propLoading || bsLoading;
  const error = propError;

  const investmentMetrics = useMemo(() => {
    if (!propertiesData?.length) return null;

    // Calculate portfolio value metrics - using estimated values
    const totalCurrentValue = propertiesData.reduce((sum, prop) => sum + 200000, 0); // Estimate $200k per property
    const totalAcquisitionCost = propertiesData.reduce((sum, prop) => sum + 160000, 0); // Estimate acquisition at 80% of current value
    const totalAppreciation = totalCurrentValue - totalAcquisitionCost;
    const appreciationRate = totalAcquisitionCost > 0 ? (totalAppreciation / totalAcquisitionCost) * 100 : 0;

    // Calculate equity metrics
    const totalMortgageBalance = balanceSheetData?.total_liabilities || (totalCurrentValue * 0.7); // Estimate 70% LTV
    const totalEquity = totalCurrentValue - totalMortgageBalance;
    const equityRatio = totalCurrentValue > 0 ? (totalEquity / totalCurrentValue) * 100 : 0;

    // Property type breakdown - simplified for now
    const propertyTypes = propertiesData.reduce((acc, prop) => {
      const type = 'Residential'; // Default to residential for now
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const propertyTypeData = Object.entries(propertyTypes).map(([type, count]) => ({
      type,
      count,
      percentage: (count / propertiesData.length) * 100,
    }));

    // Investment timeline (simulated growth over time)
    const investmentTimeline = Array.from({ length: 12 }, (_, i) => {
      const month = subMonths(new Date(), 11 - i);
      const growthRate = 0.005; // 0.5% monthly growth
      const monthlyGrowth = Math.pow(1 + growthRate, i);
      
      return {
        month: format(month, 'MMM yy'),
        value: Math.round(totalAcquisitionCost * monthlyGrowth),
        equity: Math.round((totalAcquisitionCost * monthlyGrowth - totalMortgageBalance) * (monthlyGrowth * 0.8)),
        appreciation: Math.round((totalAcquisitionCost * monthlyGrowth - totalAcquisitionCost)),
      };
    });

    // Top performing properties by estimated appreciation
    const topProperties = propertiesData
      .map(prop => {
        const currentValue = 200000; // Estimate $200k per property
        const acquisitionCost = 160000; // Estimate $160k acquisition
        const appreciation = currentValue - acquisitionCost;
        const appreciationRate = acquisitionCost > 0 ? (appreciation / acquisitionCost) * 100 : 0;
        
        return {
          address: prop.street_address || `Property ${prop.id}`,
          currentValue,
          acquisitionCost,
          appreciation,
          appreciationRate,
        };
      })
      .sort((a, b) => b.appreciationRate - a.appreciationRate)
      .slice(0, 5);

    return {
      totalCurrentValue,
      totalAcquisitionCost,
      totalAppreciation,
      appreciationRate,
      totalEquity,
      equityRatio,
      totalMortgageBalance,
      propertyTypeData,
      investmentTimeline,
      topProperties,
      totalProperties: propertiesData.length,
    };
  }, [propertiesData, balanceSheetData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <MetricSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load investment metrics</span>
        </div>
      </Card>
    );
  }

  if (!investmentMetrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No investment data available</p>
        </div>
      </Card>
    );
  }

  const getAppreciationColor = (rate: number) => {
    if (rate >= 10) return 'text-success';
    if (rate >= 5) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Key Investment Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-openkey-blue/10 rounded-lg">
              <Building className="w-5 h-5 text-openkey-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-xl font-bold text-foreground">
                ${investmentMetrics.totalCurrentValue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Appreciation</p>
              <p className={`text-xl font-bold ${getAppreciationColor(investmentMetrics.appreciationRate)}`}>
                ${investmentMetrics.totalAppreciation.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {investmentMetrics.appreciationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Equity</p>
              <p className="text-xl font-bold text-foreground">
                ${investmentMetrics.totalEquity.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {investmentMetrics.equityRatio.toFixed(1)}% of value
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <PieChart className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Properties</p>
              <p className="text-xl font-bold text-foreground">
                {investmentMetrics.totalProperties}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Investment Growth Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Portfolio Growth Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={investmentMetrics.investmentTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    name === 'value' ? 'Total Value' : 
                    name === 'equity' ? 'Equity' : 'Appreciation'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stackId="1"
                  stroke="hsl(var(--openkey-blue))" 
                  fill="hsl(var(--openkey-blue))"
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="appreciation" 
                  stackId="2"
                  stroke="hsl(var(--success))" 
                  fill="hsl(var(--success))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Property Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={investmentMetrics.propertyTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="type" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} properties`,
                    'Count'
                  ]}
                />
                <Bar dataKey="count" fill="hsl(var(--openkey-blue))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Performing Properties */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Property Performance Overview</h3>
          <div className="space-y-3">
            {investmentMetrics.topProperties.map((property, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-openkey-blue/10 text-openkey-blue text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{property.address}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: ${property.currentValue.toLocaleString()} • 
                      Acquired: ${property.acquisitionCost.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getAppreciationColor(property.appreciationRate)}`}>
                    +{property.appreciationRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    +${property.appreciation.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};