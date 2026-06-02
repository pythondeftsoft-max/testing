import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import EnhancedWaterfallChart from '../charts/EnhancedWaterfallChart';
import { usePortfolioCashFlow } from '@/hooks/usePortfolioFinancialData';
import { format, subMonths, startOfMonth } from 'date-fns';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle } from 'lucide-react';

interface CashFlowAnalysisProps {
  landlordId: string;
  portfolioId: string;
}

export const CashFlowAnalysis: React.FC<CashFlowAnalysisProps> = ({
  landlordId,
  portfolioId,
}) => {
  const endDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const startDate = useMemo(() => format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd'), []);

  const { data: cashFlowData, isLoading, error } = usePortfolioCashFlow(portfolioId, startDate, endDate);

  const chartData = useMemo(() => {
    if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) return [];

    return cashFlowData.map((item) => ({
      month: format(new Date(item.date), 'MMM yy'),
      operating: item.operating_cash_flow || 0,
      investing: item.investing_cash_flow || 0,
      financing: item.financing_cash_flow || 0,
      net: (item.operating_cash_flow || 0) + (item.investing_cash_flow || 0) + (item.financing_cash_flow || 0),
    }));
  }, [cashFlowData]);

  const currentMonthData = useMemo(() => {
    if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) return null;
    const latest = cashFlowData[cashFlowData.length - 1];
    return {
      grossRent: latest.total_income || 0,
      expenses: {
        mortgage: Math.abs(latest.debt_service || 0),
        insurance: Math.abs(latest.insurance || 0),
        maintenance: Math.abs(latest.maintenance || 0),
        management: Math.abs(latest.management_fees || 0),
        taxes: Math.abs(latest.property_taxes || 0),
        other: Math.abs(latest.other_expenses || 0),
      }
    };
  }, [cashFlowData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-4">
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load cash flow data</span>
        </div>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Cash Flow Waterfall */}
      {currentMonthData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <EnhancedWaterfallChart
              grossRent={currentMonthData.grossRent}
              expenses={currentMonthData.expenses}
              height={300}
            />
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Cash Flow Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Operating Cash Flow</p>
                  <p className="text-2xl font-bold text-success">
                    ${chartData[chartData.length - 1]?.operating?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${
                    (chartData[chartData.length - 1]?.net || 0) >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    ${chartData[chartData.length - 1]?.net?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 12-Month Cash Flow Trend */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">12-Month Cash Flow Trends</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  name === 'operating' ? 'Operating' :
                  name === 'investing' ? 'Investing' :
                  name === 'financing' ? 'Financing' : 'Net Cash Flow'
                ]}
              />
              <Legend />
              <Bar dataKey="operating" fill="hsl(var(--success))" name="Operating" />
              <Bar dataKey="investing" fill="hsl(var(--warning))" name="Investing" />
              <Bar dataKey="financing" fill="hsl(var(--info))" name="Financing" />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="hsl(var(--openkey-blue))" 
                strokeWidth={3}
                name="Net Cash Flow"
                dot={{ fill: 'hsl(var(--openkey-blue))', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};