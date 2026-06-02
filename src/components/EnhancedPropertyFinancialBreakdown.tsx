
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  Building, 
  Home, 
  AlertTriangle,
  RefreshCw,
  PieChart,
  BarChart3,
  Calculator
} from 'lucide-react';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Progress } from '@/components/ui/progress';
import { useUnitFinancialAggregation } from '@/hooks/useUnitFinancialAggregation';

interface Property {
  id: string;
  monthly_rent: number;
  unit_count?: number;
  [key: string]: any;
}

interface EnhancedPropertyFinancialBreakdownProps {
  property: Property;
  showTopMetrics?: boolean;
  showUnitPerformance?: boolean;
  showRevenueExpense?: boolean;
  showAdvancedMetrics?: boolean;
}

const EnhancedPropertyFinancialBreakdown = ({ 
  property, 
  showTopMetrics = true,
  showUnitPerformance = true,
  showRevenueExpense = true,
  showAdvancedMetrics = true
}: EnhancedPropertyFinancialBreakdownProps) => {
  const { aggregatedData, units, loading, error, refreshData } = useUnitFinancialAggregation(property.id);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !aggregatedData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p>{error || 'No unit financial data available'}</p>
            <p className="text-sm mt-1">Add unit details to see aggregated financials</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showTopMetrics && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Financial Analytics</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricDisplay
              label="Average Rent/Unit"
              value={formatCurrency(aggregatedData.averageRentPerUnit)}
              isLoading={loading}
              error={!!error}
              icon={<DollarSign className="h-4 w-4 text-primary" />}
            />
            <MetricDisplay
              label="Occupancy Rate"
              value={formatPercentage(aggregatedData.occupancyRate)}
              isLoading={loading}
              error={!!error}
              icon={<Home className="h-4 w-4 text-primary" />}
            />
            <MetricDisplay
              label="Monthly NOI"
              value={formatCurrency(aggregatedData.netOperatingIncome)}
              isLoading={loading}
              error={!!error}
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
            />
            <MetricDisplay
              label="Annual ROI"
              value={property.purchase_price && property.purchase_price > 0
                ? formatPercentage((aggregatedData.netOperatingIncome * 12 / property.purchase_price) * 100)
                : 'N/A'}
              isLoading={loading}
              error={!!error}
              icon={<PieChart className="h-4 w-4 text-primary" />}
            />
          </div>
        </>
      )}

      {/* Income vs Expenses Analysis */}
      {showRevenueExpense && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Potential Revenue</span>
                <span className="font-medium">{formatCurrency(aggregatedData.totalPotentialRent + aggregatedData.totalAdditionalIncome)}</span>
              </div>
              <Progress 
                value={100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Actual Revenue</span>
                <span className="font-medium">{formatCurrency(aggregatedData.totalIncome)}</span>
              </div>
              <Progress 
                value={(aggregatedData.totalIncome / (aggregatedData.totalPotentialRent + aggregatedData.totalAdditionalIncome)) * 100} 
                className="h-2"
              />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm font-medium">
                <span>Vacancy Loss</span>
                <span className="text-destructive">
                  -{formatCurrency((aggregatedData.totalPotentialRent + aggregatedData.totalAdditionalIncome) - aggregatedData.totalIncome)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Property-Level Expenses</span>
                <span className="font-medium">{formatCurrency(aggregatedData.totalPropertyLevelExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Unit-Level Expenses</span>
                <span className="font-medium">{formatCurrency(aggregatedData.totalUnitOperatingExpenses)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Expense Ratio</span>
                  <span>{formatPercentage((aggregatedData.totalExpenses / aggregatedData.totalIncome) * 100)}</span>
                </div>
                <Progress 
                  value={(aggregatedData.totalExpenses / aggregatedData.totalIncome) * 100} 
                  className="h-2"
                />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Net Operating Income</span>
                  <span className="text-primary">{formatCurrency(aggregatedData.netOperatingIncome)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Unit Performance Comparison */}
      {showUnitPerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Unit Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Best Performing Unit */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Best Performer</h4>
                {units.length > 0 && (() => {
                  const bestUnit = [...aggregatedData.unitSummaries].sort((a, b) => b.unitNetIncome - a.unitNetIncome)[0];
                  return (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="font-medium">{bestUnit.unitNumber || `Unit ${bestUnit.unitId.slice(0, 8)}`}</div>
                      <div className="text-sm text-muted-foreground">
                        Net: {formatCurrency(bestUnit.unitNetIncome)}/mo
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {formatPercentage((bestUnit.unitNetIncome / bestUnit.totalUnitIncome) * 100)} margin
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Occupancy Overview */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Occupancy Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Occupied Units</span>
                    <span className="font-medium">{aggregatedData.occupiedUnits} / {aggregatedData.totalUnits}</span>
                  </div>
                  <Progress 
                    value={aggregatedData.occupancyRate} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {aggregatedData.totalUnits - aggregatedData.occupiedUnits} vacant units
                  </div>
                </div>
              </div>

              {/* Units Needing Attention */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Needs Attention</h4>
                {(() => {
                  const underperformingUnits = aggregatedData.unitSummaries.filter(unit => {
                    const margin = unit.totalUnitIncome > 0 ? (unit.unitNetIncome / unit.totalUnitIncome) * 100 : 0;
                    return margin < 70 || unit.status !== 'occupied';
                  });
                  return underperformingUnits.length > 0 ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="font-medium">{underperformingUnits.length} units</div>
                      <div className="text-sm text-muted-foreground">
                        Low margins or vacant
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        Review recommended
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="font-medium">All units</div>
                      <div className="text-sm text-muted-foreground">
                        Performing well
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        No issues detected
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Financial Metrics */}
      {showAdvancedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {formatPercentage((aggregatedData.netOperatingIncome * 12 / (property.purchase_price || aggregatedData.totalPotentialRent * 20)) * 100)}
                </div>
                <div className="text-sm text-muted-foreground">Est. Cap Rate</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(aggregatedData.totalIncome / aggregatedData.totalUnits)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Revenue/Unit</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(aggregatedData.totalExpenses / aggregatedData.totalUnits)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Expenses/Unit</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {formatPercentage((aggregatedData.netOperatingIncome / aggregatedData.totalIncome) * 100)}
                </div>
                <div className="text-sm text-muted-foreground">Net Margin</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedPropertyFinancialBreakdown;
