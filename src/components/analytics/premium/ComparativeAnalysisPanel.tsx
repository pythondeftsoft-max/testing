import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  ArrowUpDown,
  Info
} from 'lucide-react';
import { useRealComparativeData } from '@/hooks/useRealComparativeData';

interface ComparativeData {
  label: string;
  current: number;
  previous: number;
  benchmark: number;
  portfolio: number;
  trend: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  color: string;
}

interface ComparativeAnalysisPanelProps {
  landlordId: string;
  portfolioId?: string;
  timeRange: 'previous_month' | 'previous_quarter' | 'previous_year';
  className?: string;
}

const ComparativeAnalysisPanel: React.FC<ComparativeAnalysisPanelProps> = ({
  landlordId,
  portfolioId,
  timeRange,
  className = ''
}) => {
  const [selectedComparison, setSelectedComparison] = useState<'period' | 'benchmark' | 'portfolio'>('period');
  
  const { data: metrics, loading, error } = useRealComparativeData(landlordId, portfolioId, timeRange);

  const getComparisonData = (metric: ComparativeData) => {
    switch (selectedComparison) {
      case 'period':
        return {
          value: metric.current,
          comparison: metric.previous,
          label: 'vs Previous Period',
          change: metric.trend
        };
      case 'benchmark':
        return {
          value: metric.current,
          comparison: metric.benchmark,
          label: 'vs Industry Benchmark',
          change: ((metric.current - metric.benchmark) / metric.benchmark) * 100
        };
      case 'portfolio':
        return {
          value: metric.current,
          comparison: metric.portfolio,
          label: 'vs Portfolio Average',
          change: ((metric.current - metric.portfolio) / metric.portfolio) * 100
        };
      default:
        return {
          value: metric.current,
          comparison: metric.previous,
          label: 'vs Previous Period',
          change: metric.trend
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-health-excellent';
      case 'good': return 'text-health-good';
      case 'average': return 'text-yellow-600';
      case 'poor': return 'text-health-attention';
      default: return 'text-muted-foreground';
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
  };

  const formatValue = (value: number, label: string) => {
    if (label.toLowerCase().includes('rate') || 
        label.toLowerCase().includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    if (label.toLowerCase().includes('days')) {
      return `${value.toFixed(1)} days`;
    }
    return value.toLocaleString();
  };

  const getCalculationExplanation = (label: string) => {
    switch (label.toLowerCase()) {
      case 'occupancy rate':
        return 'Calculated as (Total Units - Vacant Units) / Total Units × 100';
      case 'collection rate':
        return 'Calculated as Total Rent Collected / Total Rent Due × 100';
      case 'maintenance cost/unit':
        return 'Calculated as Total Maintenance Costs / Number of Units';
      case 'tenant satisfaction':
        return 'Based on survey responses and maintenance request resolution times';
      default:
        return 'Metric calculation methodology';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Comparative Analysis
            </h3>
            <Badge variant="outline" className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {timeRange}
            </Badge>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Comparative Analysis
            </h3>
          </div>
          <p className="text-muted-foreground">Unable to load comparative analysis data.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Comparison Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Comparative Analysis - Real Data
          </h3>
          <Badge variant="outline" className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {timeRange.replace('_', ' ')}
          </Badge>
        </div>

        <div className="flex space-x-2">
          <Button
            variant={selectedComparison === 'period' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedComparison('period')}
          >
            Time Period
          </Button>
          <Button
            variant={selectedComparison === 'benchmark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedComparison('benchmark')}
          >
            Industry Benchmark
          </Button>
          <Button
            variant={selectedComparison === 'portfolio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedComparison('portfolio')}
          >
            Portfolio Average
          </Button>
        </div>
      </Card>

      {/* Comparative Metrics Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const compData = getComparisonData(metric);

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 transition-all duration-200 hover:shadow-lg">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm truncate">{metric.label}</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">{getCalculationExplanation(metric.label)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className={getStatusColor(metric.status)}>
                        {metric.status.replace('-', ' ')}
                      </Badge>
                    </div>

                    {/* Current Value */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {formatValue(compData.value, metric.label)}
                      </div>
                      <div className="text-xs text-muted-foreground">Current Value</div>
                    </div>

                    {/* Comparison */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{compData.label}</span>
                        <span className="font-medium">
                          {formatValue(compData.comparison, metric.label)}
                        </span>
                      </div>

                      <div className="flex items-center justify-center space-x-2">
                        {getChangeIcon(compData.change)}
                        <span className={`text-sm font-medium ${
                          compData.change > 0 ? 'text-green-600' : 
                          compData.change < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {compData.change > 0 ? '+' : ''}{compData.change.toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`rounded-full h-2 transition-all duration-500 ${
                            compData.change > 0 ? 'bg-green-500' : 
                            compData.change < 0 ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.abs(compData.change) * 2)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ComparativeAnalysisPanel;