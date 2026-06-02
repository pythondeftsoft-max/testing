import React from 'react';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface HoldingsSummary {
  total_assets: number;
  total_market_value: number;
  total_cost_basis: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  total_annual_income: number;
  top_performer?: {
    symbol: string;
    change_percent: number;
  };
  worst_performer?: {
    symbol: string;
    change_percent: number;
  };
  allocationByType?: Record<string, number>;
}

interface HoldingsMetricsProps {
  summary?: HoldingsSummary;
  isLoading: boolean;
}

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const HoldingsMetrics = ({ summary, isLoading }: HoldingsMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <CardEnhanced key={i} className="p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </div>
          </CardEnhanced>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Value',
      value: summary?.total_market_value || 0,
      subtext: `${summary?.total_assets || 0} assets`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Total P&L',
      value: summary?.total_unrealized_pl || 0,
      subtext: formatPercent(summary?.total_unrealized_pl_percent || 0),
      icon: (summary?.total_unrealized_pl || 0) >= 0 ? TrendingUp : TrendingDown,
      color: (summary?.total_unrealized_pl || 0) >= 0 ? 'text-success' : 'text-danger',
    },
    {
      title: 'Annual Income',
      value: summary?.total_annual_income || 0,
      subtext: 'Expected yearly',
      icon: Target,
      color: 'text-openkey-gold',
    },
    {
      title: 'Cost Basis',
      value: summary?.total_cost_basis || 0,
      subtext: 'Total invested',
      icon: Award,
      color: 'text-info',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <CardEnhanced key={index} className="p-6 card-hover">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold">
                  <CurrencyDisplay amount={metric.value} />
                </p>
                <p className={`text-sm ${metric.color}`}>
                  {metric.subtext}
                </p>
              </div>
              <div className={`p-2 rounded-lg bg-background/50 ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
            </div>
          </CardEnhanced>
        ))}
      </div>

      {/* Performance Highlights */}
      {(summary?.top_performer || summary?.worst_performer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.top_performer && (
            <CardEnhanced className="p-6 border-success/20 bg-success/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Top Performer
                  </p>
                  <p className="font-semibold">
                    {summary.top_performer.symbol}
                  </p>
                  <p className="text-sm text-success">
                    {formatPercent(summary.top_performer.change_percent)}
                  </p>
                </div>
              </div>
            </CardEnhanced>
          )}

          {summary.worst_performer && (
            <CardEnhanced className="p-6 border-danger/20 bg-danger/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-danger/10">
                  <TrendingDown className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Worst Performer
                  </p>
                  <p className="font-semibold">
                    {summary.worst_performer.symbol}
                  </p>
                  <p className="text-sm text-danger">
                    {formatPercent(summary.worst_performer.change_percent)}
                  </p>
                </div>
              </div>
            </CardEnhanced>
          )}
        </div>
      )}
    </div>
  );
};

export default HoldingsMetrics;