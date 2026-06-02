import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';
import { usePortfolioProperties } from '@/hooks/usePortfolioFinancialData';
import { usePortfolioBalanceSheet } from '@/hooks/usePortfolioFinancialData';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, Building, TrendingUp, PieChart, Target, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import ROISpeedometerChart from '../charts/ROISpeedometerChart';
import { generateMockPropertiesData, generateMockInvestmentData, getRandomScenario } from '@/utils/mockFinancialReports';
import { FinancialWidgetWrapper } from '../wrappers/FinancialWidgetWrapper';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { TotalNetWorthCard } from '../widgets/TotalNetWorthCard';

interface InvestmentAndPortfolioPerformanceProps {
  landlordId: string;
  portfolioId: string;
  filters?: {
    startDate: string;
    endDate: string;
    propertyIds: string[];
    propertyTypes: string[];
    categories: {
      rent: boolean;
      fees: boolean;
      maintenance: boolean;
      insurance: boolean;
      taxes: boolean;
      management: boolean;
      other: boolean;
    };
  };
  // Widget management props
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  isWidgetVisible: (widgetId: string) => boolean;
  onDeleteWidget: (widgetId: string) => void;
  onRegenerateWidget: (widgetId: string) => void;
  getRegenerationCount: (widgetId: string) => number;
}

export const InvestmentAndPortfolioPerformance: React.FC<InvestmentAndPortfolioPerformanceProps> = ({
  landlordId,
  portfolioId,
  filters,
  isFavorited,
  onToggleFavorite,
  isWidgetVisible,
  onDeleteWidget,
  onRegenerateWidget,
  getRegenerationCount,
}) => {
  // Use custom date from filters if provided, otherwise use current date
  const asOfDate = useMemo(() => 
    filters?.endDate || format(new Date(), 'yyyy-MM-dd'), 
    [filters?.endDate]
  );
  
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useEnhancedLandlordAnalytics(landlordId);
  const { data: propertiesData, isLoading: propLoading, error: propError } = usePortfolioProperties(portfolioId);
  const { data: balanceSheetData, isLoading: bsLoading } = usePortfolioBalanceSheet(portfolioId, asOfDate);

  // Generate mock data when real data is unavailable (with regeneration cycling)
  const mockPropsData = useMemo(() => {
    const regenerations = getRegenerationCount('portfolio-value');
    const scenarioIndex = regenerations % 8;
    const scenarios = ['high-performing', 'average', 'struggling', 'growing', 'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'];
    return generateMockPropertiesData(scenarios[scenarioIndex] as any);
  }, [getRegenerationCount]);
  
  const mockInvestmentData = useMemo(() => {
    const regenerations = getRegenerationCount('portfolio-value');
    const scenarioIndex = regenerations % 8;
    const scenarios = ['high-performing', 'average', 'struggling', 'growing', 'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'];
    return generateMockInvestmentData(scenarios[scenarioIndex] as any);
  }, [getRegenerationCount]);
  
  const effectivePropsData = propertiesData || mockPropsData;

  const isLoading = analyticsLoading || propLoading || bsLoading;
  const error = analyticsError || propError;

  const combinedMetrics = useMemo(() => {
    // Force mock data mode for demonstration - check if real data is insufficient
    const shouldUseMockData = !propertiesData || propertiesData.length === 0 || error;
    
    if (shouldUseMockData) {
      console.log('InvestmentAndPortfolioPerformance - Using mock data');
      console.log('InvestmentAndPortfolioPerformance - propertiesData:', propertiesData);
      console.log('InvestmentAndPortfolioPerformance - mockInvestmentData:', mockInvestmentData);
      console.log('InvestmentAndPortfolioPerformance - error:', error);
      
      // Use pure mock data when no real data is available
      const mockProps = mockPropsData || [];
      const mockMetrics = {
        ...mockInvestmentData,
        cashOnCashReturn: mockInvestmentData.cashOnCash, // Fix naming mismatch
        totalCurrentValue: mockInvestmentData.totalValue,
        annualNOI: Math.round(mockInvestmentData.totalValue * (mockInvestmentData.capRate / 100)),
        monthlyRent: Math.round(mockInvestmentData.totalValue * (mockInvestmentData.capRate / 100) / 12),
        totalProperties: mockProps.length,
        totalAcquisitionCost: Math.round(mockInvestmentData.totalValue * 0.8),
        totalAppreciation: Math.round(mockInvestmentData.totalValue * 0.2),
        appreciationRate: mockInvestmentData.appreciationRate,
        totalEquity: mockInvestmentData.totalEquity,
        equityRatio: mockInvestmentData.equityRatio,
        totalMortgageBalance: mockInvestmentData.totalValue - mockInvestmentData.totalEquity,
        rentToValueRatio: mockInvestmentData.capRate / 12, // Convert annual to monthly ratio
        propertyTypeData: [{ type: 'Residential', count: mockProps.length, percentage: 100 }],
        investmentTimeline: Array.from({ length: 12 }, (_, i) => {
          const month = subMonths(new Date(), 11 - i);
          const growthRate = 0.005;
          const monthlyGrowth = Math.pow(1 + growthRate, i);
          const baseValue = mockInvestmentData.totalValue * 0.8;
          return {
            month: format(month, 'MMM yy'),
            value: Math.round(baseValue * monthlyGrowth),
            equity: Math.round((baseValue * monthlyGrowth) * (mockInvestmentData.equityRatio / 100)),
            appreciation: Math.round((baseValue * monthlyGrowth - baseValue)),
            roi: Math.round(((baseValue * monthlyGrowth - baseValue) / baseValue) * 100 * 100) / 100,
          };
        }),
        topProperties: mockProps.slice(0, 5).map((prop, i) => ({
          address: prop.street_address || `Property ${i + 1}`,
          currentValue: 200000,
          acquisitionCost: 160000,
          appreciation: 40000,
          appreciationRate: mockInvestmentData.appreciationRate,
          capRate: mockInvestmentData.capRate + (Math.random() - 0.5) * 2,
          annualNOI: Math.round(200000 * (mockInvestmentData.capRate / 100)),
        }))
      };
      
      console.log('InvestmentAndPortfolioPerformance - Final mock metrics:', mockMetrics);
      return mockMetrics;
    }

    // ROI Metrics calculation
    const totalCurrentValue = effectivePropsData.reduce((sum, prop) => sum + 200000, 0); // Estimate $200k per property
    const totalAcquisitionCost = effectivePropsData.reduce((sum, prop) => sum + 160000, 0); // Estimate acquisition at 80%
    const monthlyRent = effectivePropsData.reduce((sum, prop) => sum + 1200, 0); // Estimate $1200/month per property
    const annualNOI = monthlyRent * 12 * 0.6; // Estimate 60% NOI margin

    // ROI Calculations
    const capRate = totalCurrentValue > 0 ? (annualNOI / totalCurrentValue) * 100 : 0;
    const cashOnCashReturn = totalAcquisitionCost > 0 ? (annualNOI / (totalAcquisitionCost * 0.25)) * 100 : 0; // Assuming 25% down payment
    const rentToValueRatio = totalCurrentValue > 0 ? (monthlyRent / totalCurrentValue) * 100 : 0;

    // Investment Growth Metrics
    const totalAppreciation = totalCurrentValue - totalAcquisitionCost;
    const appreciationRate = totalAcquisitionCost > 0 ? (totalAppreciation / totalAcquisitionCost) * 100 : 0;
    
    // Equity Metrics
    const totalMortgageBalance = balanceSheetData?.total_liabilities || (totalCurrentValue * 0.7); // Estimate 70% LTV
    const totalEquity = totalCurrentValue - totalMortgageBalance;
    const equityRatio = totalCurrentValue > 0 ? (totalEquity / totalCurrentValue) * 100 : 0;

    // Property type breakdown
    const propertyTypes = effectivePropsData.reduce((acc, prop) => {
      const type = 'Residential'; // Default to residential for now
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const propertyTypeData = Object.entries(propertyTypes).map(([type, count]) => ({
      type,
      count,
      percentage: (count / effectivePropsData.length) * 100,
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
        roi: Math.round(((totalAcquisitionCost * monthlyGrowth - totalAcquisitionCost) / totalAcquisitionCost) * 100 * 100) / 100,
      };
    });

    // Top performing properties by estimated performance
    const topProperties = effectivePropsData
      .map(prop => {
        const currentValue = 200000; // Estimate $200k per property
        const acquisitionCost = 160000; // Estimate $160k acquisition
        const appreciation = currentValue - acquisitionCost;
        const appreciationRate = acquisitionCost > 0 ? (appreciation / acquisitionCost) * 100 : 0;
        const monthlyRent = 1200; // Estimate $1200/month
        const annualNOI = monthlyRent * 12 * 0.6; // 60% NOI margin
        const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;
        
        return {
          address: prop.street_address || `Property ${prop.id}`,
          currentValue,
          acquisitionCost,
          appreciation,
          appreciationRate,
          capRate,
          annualNOI,
        };
      })
      .sort((a, b) => b.capRate - a.capRate)
      .slice(0, 5);

    return {
      // ROI Metrics
      capRate,
      cashOnCashReturn,
      rentToValueRatio,
      totalCurrentValue,
      annualNOI,
      monthlyRent,
      totalProperties: effectivePropsData.length,
      
      // Investment Metrics
      totalAcquisitionCost,
      totalAppreciation,
      appreciationRate,
      totalEquity,
      equityRatio,
      totalMortgageBalance,
      propertyTypeData,
      investmentTimeline,
      topProperties,
    };
  }, [effectivePropsData, analyticsData, balanceSheetData, mockInvestmentData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <MetricSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  if (error && !mockPropsData && !combinedMetrics) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load investment and portfolio data</span>
        </div>
      </Card>
    );
  }

  if (!combinedMetrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No investment data available</p>
        </div>
      </Card>
    );
  }

  const getPerformanceColor = (rate: number, thresholds: { good: number; fair: number }) => {
    if (rate >= thresholds.good) return 'text-success';
    if (rate >= thresholds.fair) return 'text-warning';
    return 'text-destructive';
  };

  const TotalNetWorthWidget = () => {
    if (!isWidgetVisible('total-net-worth')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-net-worth"
        title="Total Net Worth"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('total-net-worth')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <TotalNetWorthCard 
          landlordId={landlordId} 
          portfolioId={portfolioId}
          userId={landlordId}
        />
      </FinancialWidgetWrapper>
    );
  };

  const CapRateSpeedometerWidget = () => {
    if (!isWidgetVisible('cap-rate-speedometer')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="cap-rate-speedometer"
        title="Cap Rate"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('cap-rate-speedometer')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
        value={combinedMetrics.capRate}
        subtitle="Annual NOI / Property Value"
        chartConfig={{
          chartType: 'speedometer',
          maxValue: 15,
          zones: [
            { label: 'Poor', min: 0, max: 4, color: 'hsl(var(--destructive))' },
            { label: 'Fair', min: 4, max: 8, color: 'hsl(var(--warning))' },
            { label: 'Good', min: 8, max: 15, color: 'hsl(var(--success))' }
          ]
        }}
      >
        <div className="text-center">
          <ROISpeedometerChart
            value={combinedMetrics.capRate}
            title="Cap Rate"
            maxValue={15}
            zones={[
              { label: 'Poor', min: 0, max: 4, color: 'hsl(var(--destructive))' },
              { label: 'Fair', min: 4, max: 8, color: 'hsl(var(--warning))' },
              { label: 'Good', min: 8, max: 15, color: 'hsl(var(--success))' }
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Annual NOI / Property Value
          </p>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const CashOnCashSpeedometerWidget = () => {
    if (!isWidgetVisible('cash-on-cash-speedometer')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="cash-on-cash-speedometer"
        title="Cash-on-Cash Return"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('cash-on-cash-speedometer')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
        value={combinedMetrics.cashOnCashReturn}
        subtitle="Annual Cash Flow / Cash Invested"
        chartConfig={{
          chartType: 'speedometer',
          maxValue: 20,
          zones: [
            { label: 'Poor', min: 0, max: 6, color: 'hsl(var(--destructive))' },
            { label: 'Fair', min: 6, max: 12, color: 'hsl(var(--warning))' },
            { label: 'Good', min: 12, max: 20, color: 'hsl(var(--success))' }
          ]
        }}
      >
        <div className="text-center">
          <ROISpeedometerChart
            value={combinedMetrics.cashOnCashReturn}
            title="Cash-on-Cash Return"
            maxValue={20}
            zones={[
              { label: 'Poor', min: 0, max: 6, color: 'hsl(var(--destructive))' },
              { label: 'Fair', min: 6, max: 12, color: 'hsl(var(--warning))' },
              { label: 'Good', min: 12, max: 20, color: 'hsl(var(--success))' }
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Annual Cash Flow / Cash Invested
          </p>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const RentToValueSpeedometerWidget = () => {
    if (!isWidgetVisible('rent-to-value-speedometer')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="rent-to-value-speedometer"
        title="Rent-to-Value Ratio"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('rent-to-value-speedometer')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
        value={combinedMetrics.rentToValueRatio}
        subtitle="Monthly Rent / Property Value"
        chartConfig={{
          chartType: 'speedometer',
          maxValue: 2,
          zones: [
            { label: 'Poor', min: 0, max: 0.5, color: 'hsl(var(--destructive))' },
            { label: 'Fair', min: 0.5, max: 1, color: 'hsl(var(--warning))' },
            { label: 'Good', min: 1, max: 2, color: 'hsl(var(--success))' }
          ]
        }}
      >
        <div className="text-center">
          <ROISpeedometerChart
            value={combinedMetrics.rentToValueRatio || 1.2}
            title="Rent-to-Value Ratio"
            maxValue={2}
            zones={[
              { label: 'Poor', min: 0, max: 0.5, color: 'hsl(var(--destructive))' },
              { label: 'Fair', min: 0.5, max: 1, color: 'hsl(var(--warning))' },
              { label: 'Good', min: 1, max: 2, color: 'hsl(var(--success))' }
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Monthly Rent / Property Value
          </p>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const PortfolioValueWidget = () => {
    if (!isWidgetVisible('portfolio-value')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="portfolio-value"
        title="Portfolio Value"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('portfolio-value')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-openkey-blue/10 rounded-lg">
            <Building className="w-5 h-5 text-openkey-blue" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Portfolio Value</p>
            <p className="text-xl font-bold text-foreground">
              ${combinedMetrics.totalCurrentValue.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const TotalAppreciationWidget = () => {
    if (!isWidgetVisible('total-appreciation')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-appreciation"
        title="Total Appreciation"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('total-appreciation')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Appreciation</p>
            <p className={`text-xl font-bold ${getPerformanceColor(combinedMetrics.appreciationRate, { good: 10, fair: 5 })}`}>
              ${combinedMetrics.totalAppreciation.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {combinedMetrics.appreciationRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const TotalEquityWidget = () => {
    if (!isWidgetVisible('total-equity')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-equity"
        title="Total Equity"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('total-equity')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <Target className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Equity</p>
            <p className="text-xl font-bold text-foreground">
              ${combinedMetrics.totalEquity.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {combinedMetrics.equityRatio.toFixed(1)}% of value
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const AnnualNOIWidget = () => {
    if (!isWidgetVisible('annual-noi')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="annual-noi"
        title="Annual NOI"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('annual-noi')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Annual NOI</p>
            <p className="text-xl font-bold text-foreground">
              ${combinedMetrics.annualNOI.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {combinedMetrics.totalProperties} properties
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const PropertyTypeDistributionWidget = () => {
    if (!isWidgetVisible('property-type-distribution')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="property-type-distribution"
        title="Property Type Distribution"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('property-type-distribution')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={combinedMetrics.propertyTypeData}>
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
              />
              <Bar dataKey="count" fill="hsl(var(--openkey-blue))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const PropertyPerformanceOverviewWidget = () => {
    if (!isWidgetVisible('property-performance-overview')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="property-performance-overview"
        title="Property Performance Overview"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('property-performance-overview')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="panel"
      >
        <div className="space-y-2">
          {combinedMetrics.topProperties.map((property, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-muted/20 rounded">
              <div>
                <p className="font-medium text-sm">{property.address}</p>
                <p className="text-xs text-muted-foreground">
                  ${property.currentValue.toLocaleString()} value
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getPerformanceColor(property.capRate, { good: 8, fair: 4 })}`}>
                  {property.capRate.toFixed(1)}% Cap Rate
                </p>
                <p className="text-xs text-muted-foreground">
                  +${property.appreciation.toLocaleString()} ({property.appreciationRate.toFixed(1)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const ROIComparisonWidget = () => {
    if (!isWidgetVisible('roi-comparison')) return null;
    
    // Generate mock ROI comparison data
    const roiComparisonData = useMemo(() => {
      const regenerations = getRegenerationCount('roi-comparison');
      const baseMultiplier = 1 + (regenerations * 0.1);
      
      return combinedMetrics.topProperties.map((property, index) => ({
        property: property.address.length > 20 ? 
          property.address.substring(0, 17) + '...' : property.address,
        capRate: Math.round((property.capRate + (Math.random() - 0.5) * 2) * baseMultiplier * 10) / 10,
        cashOnCash: Math.round((8 + Math.random() * 8 + index) * baseMultiplier * 10) / 10,
        totalROI: Math.round((12 + Math.random() * 10 + index * 2) * baseMultiplier * 10) / 10,
      }));
    }, [combinedMetrics.topProperties, getRegenerationCount]);

    const getROIColor = (value: number) => {
      if (value >= 10) return 'hsl(var(--success))';
      if (value >= 6) return 'hsl(var(--warning))';
      return 'hsl(var(--destructive))';
    };

    return (
      <FinancialWidgetWrapper
        widgetId="roi-comparison"
        title="ROI Comparison"
        tab="financial"
        category="investment"
        isFavorited={isFavorited('roi-comparison')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            Compare ROI metrics across your top properties
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={roiComparisonData} 
              layout="horizontal"
              margin={{ left: 80, right: 30, top: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="category"
                dataKey="property"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`, 
                  name === 'capRate' ? 'Cap Rate' :
                  name === 'cashOnCash' ? 'Cash-on-Cash' : 'Total ROI'
                ]}
              />
              <Bar dataKey="capRate" fill="hsl(var(--openkey-blue))" />
              <Bar dataKey="cashOnCash" fill="hsl(var(--success))" />
              <Bar dataKey="totalROI" fill="hsl(var(--warning))" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-openkey-blue" />
              <span>Cap Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Cash-on-Cash</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Total ROI</span>
            </div>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  return (
    <div className="space-y-6">
      {/* ROI Speedometer Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CapRateSpeedometerWidget />
        <CashOnCashSpeedometerWidget />
        <RentToValueSpeedometerWidget />
      </div>

      {/* Key Investment & Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalNetWorthWidget />
        <PortfolioValueWidget />
        <TotalAppreciationWidget />
        <TotalEquityWidget />
        <AnnualNOIWidget />
      </div>

      {/* Investment Growth Timeline & Property Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Investment Growth Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combinedMetrics.investmentTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    name === 'value' ? 'Portfolio Value' :
                    name === 'equity' ? 'Total Equity' : 'Appreciation'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--openkey-blue))" 
                  fill="hsl(var(--openkey-blue))"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="appreciation" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--warning))', strokeWidth: 2, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <PropertyTypeDistributionWidget />
      </div>

      {/* Property Performance Overview */}
      <PropertyPerformanceOverviewWidget />

      {/* ROI Comparison */}
      <ROIComparisonWidget />
    </div>
  );
};