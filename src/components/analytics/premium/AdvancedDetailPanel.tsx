import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import * as d3 from 'd3';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  metric: {
    label: string;
    value: number;
    status: string;
    trend: number;
    breakdown?: {
      current: number;
      previous: number;
      target: number;
      categories: Array<{
        name: string;
        value: number;
        percentage: number;
        trend: number;
      }>;
    };
  } | null;
  className?: string;
}

const AdvancedDetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  metric,
  className = ''
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [chartData, setChartData] = useState<any[]>([]);

  // Generate sample historical data for the chart
  useEffect(() => {
    if (metric) {
      const generateData = () => {
        const data = [];
        const days = selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365;
        const baseValue = metric.value;
        
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const variation = (Math.random() - 0.5) * 10;
          data.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(0, baseValue + variation),
            target: metric.breakdown?.target || baseValue * 1.1
          });
        }
        return data;
      };
      
      setChartData(generateData());
    }
  }, [metric, selectedTimeRange]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-health-excellent" />;
      case 'good':
        return <Target className="w-4 h-4 text-health-good" />;
      case 'needs attention':
        return <AlertTriangle className="w-4 h-4 text-health-attention" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Calendar className="w-4 h-4 text-muted-foreground" />;
  };

  const formatValue = (value: number) => {
    if (metric?.label.toLowerCase().includes('rate') || 
        metric?.label.toLowerCase().includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    if (metric?.label.toLowerCase().includes('days')) {
      return `${value.toFixed(1)} days`;
    }
    return value.toLocaleString();
  };

  if (!metric) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-background border-l border-border z-50 overflow-y-auto ${className}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{metric.label}</h2>
                    <p className="text-sm text-muted-foreground">Detailed Analytics</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {formatValue(metric.value)}
                    </div>
                    <div className="text-sm text-muted-foreground">Current</div>
                    <div className="flex items-center justify-center mt-2">
                      {getTrendIcon(metric.trend)}
                      <span className={`text-xs ml-1 ${
                        metric.trend > 0 ? 'text-green-600' : 
                        metric.trend < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Card>

                {metric.breakdown && (
                  <>
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-muted-foreground mb-1">
                          {formatValue(metric.breakdown.previous)}
                        </div>
                        <div className="text-sm text-muted-foreground">Previous Period</div>
                        <Badge variant="outline" className="mt-2">
                          Last Month
                        </Badge>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {formatValue(metric.breakdown.target)}
                        </div>
                        <div className="text-sm text-muted-foreground">Target</div>
                        <Badge 
                          variant={metric.value >= metric.breakdown.target ? "default" : "destructive"} 
                          className="mt-2"
                        >
                          {metric.value >= metric.breakdown.target ? 'On Track' : 'Behind'}
                        </Badge>
                      </div>
                    </Card>
                  </>
                )}
              </div>

              {/* Tabs for different views */}
              <Tabs defaultValue="trends" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                  <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="trends" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Historical Trends</h3>
                    <div className="flex space-x-2">
                      {['30d', '90d', '1y'].map((range) => (
                        <Button
                          key={range}
                          variant={selectedTimeRange === range ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTimeRange(range)}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Card className="p-4">
                    <div className="h-64 w-full">
                      {/* Simple trend visualization */}
                      <div className="text-center text-muted-foreground mt-20">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                        <p>Trend Chart</p>
                        <p className="text-xs">Historical data for {selectedTimeRange}</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-4">
                  <h3 className="text-lg font-semibold">Category Breakdown</h3>
                  
                  {metric.breakdown?.categories && (
                    <div className="space-y-3">
                      {metric.breakdown.categories.map((category, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{category.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {category.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary rounded-full h-2 transition-all duration-300"
                                  style={{ width: `${category.percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="font-semibold">{formatValue(category.value)}</div>
                              <div className="flex items-center text-sm">
                                {getTrendIcon(category.trend)}
                                <span className={`ml-1 ${
                                  category.trend > 0 ? 'text-green-600' : 
                                  category.trend < 0 ? 'text-red-600' : 'text-muted-foreground'
                                }`}>
                                  {category.trend > 0 ? '+' : ''}{category.trend.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  <h3 className="text-lg font-semibold">AI Insights & Recommendations</h3>
                  
                  <div className="space-y-4">
                    <Card className="p-4 border-l-4 border-l-green-500">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">Positive Trend</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your {metric.label.toLowerCase()} has improved by {Math.abs(metric.trend).toFixed(1)}% 
                            compared to last month, indicating strong performance.
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start space-x-3">
                        <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800">Recommendation</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            To maintain this positive trend, consider implementing automated 
                            monitoring for early detection of potential issues.
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 border-l-4 border-l-orange-500">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-800">Watch Point</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Monitor seasonal variations that typically occur in the next quarter 
                            to proactively address potential dips.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedDetailPanel;