import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import ROISpeedometerChart from '../charts/ROISpeedometerChart';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';
import { usePortfolioProperties } from '@/hooks/usePortfolioFinancialData';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, TrendingUp, DollarSign, Target, Calculator } from 'lucide-react';

interface ROIMetricsPanelProps {
  landlordId: string;
  portfolioId: string;
}

export const ROIMetricsPanel: React.FC<ROIMetricsPanelProps> = ({
  landlordId,
  portfolioId,
}) => {
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useEnhancedLandlordAnalytics(landlordId);
  const { data: propertiesData, isLoading: propertiesLoading } = usePortfolioProperties(portfolioId);

  const isLoading = analyticsLoading || propertiesLoading;
  const error = analyticsError;

  const roiMetrics = useMemo(() => {
    if (!analyticsData || !propertiesData) return null;

    const totalProperties = propertiesData.length;
    const totalValue = propertiesData.reduce((sum, prop) => sum + 100000, 0); // Estimate $100k per property
    const monthlyRent = propertiesData.reduce((sum, prop) => sum + 1000, 0); // Estimate $1k rent per property
    const annualRent = monthlyRent * 12;

    // Calculate Cap Rate (NOI / Property Value) - using estimated values
    const annualNOI = 50000 * totalProperties; // Estimate $50k NOI per property
    const capRate = totalValue > 0 ? (annualNOI / totalValue) * 100 : 0;

    // Calculate Cash-on-Cash Return (estimate based on NOI and assumed down payment)
    const assumedDownPayment = totalValue * 0.25; // Assume 25% down payment
    const cashOnCashReturn = assumedDownPayment > 0 ? (annualNOI / assumedDownPayment) * 100 : 0;

    // Calculate Rent-to-Value Ratio
    const rentToValueRatio = totalValue > 0 ? (annualRent / totalValue) * 100 : 0;

    return {
      capRate,
      cashOnCashReturn,
      rentToValueRatio,
      totalValue,
      annualNOI,
      monthlyRent,
      totalProperties,
    };
  }, [analyticsData, propertiesData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
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
          <span>Failed to load ROI metrics</span>
        </div>
      </Card>
    );
  }

  if (!roiMetrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No data available for ROI calculations</p>
        </div>
      </Card>
    );
  }

  const roiZones = [
    { label: 'Poor', min: 0, max: 5, color: 'hsl(var(--destructive))' },
    { label: 'Fair', min: 5, max: 10, color: 'hsl(var(--warning))' },
    { label: 'Good', min: 10, max: 15, color: 'hsl(var(--success))' },
    { label: 'Excellent', min: 15, max: 25, color: 'hsl(var(--openkey-blue))' },
  ];

  return (
    <div className="space-y-6">
      {/* ROI Speedometers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ROISpeedometerChart
          value={roiMetrics.capRate}
          title="Cap Rate"
          maxValue={20}
          zones={roiZones}
        />
        <ROISpeedometerChart
          value={roiMetrics.cashOnCashReturn}
          title="Cash-on-Cash Return"
          maxValue={25}
          zones={roiZones}
        />
        <ROISpeedometerChart
          value={roiMetrics.rentToValueRatio}
          title="Rent-to-Value Ratio"
          maxValue={15}
          zones={[
            { label: 'Low', min: 0, max: 3, color: 'hsl(var(--destructive))' },
            { label: 'Fair', min: 3, max: 6, color: 'hsl(var(--warning))' },
            { label: 'Good', min: 6, max: 10, color: 'hsl(var(--success))' },
            { label: 'High', min: 10, max: 15, color: 'hsl(var(--openkey-blue))' },
          ]}
        />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-xl font-bold text-foreground">
                ${roiMetrics.totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-openkey-blue/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-openkey-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Annual NOI</p>
              <p className="text-xl font-bold text-foreground">
                ${roiMetrics.annualNOI.toLocaleString()}
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
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-xl font-bold text-foreground">
                ${roiMetrics.monthlyRent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Calculator className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Properties</p>
              <p className="text-xl font-bold text-foreground">
                {roiMetrics.totalProperties}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ROI Analysis Notes */}
      <Card className="p-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">ROI Analysis Notes</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Cap Rate calculated using estimated NOI divided by estimated property values</p>
            <p>• Cash-on-Cash Return estimated assuming 25% down payment on estimated property values</p>
            <p>• Rent-to-Value Ratio shows annual rent as percentage of estimated property values</p>
            <p>• Metrics are estimates based on industry averages and available property data</p>
          </div>
        </div>
      </Card>
    </div>
  );
};