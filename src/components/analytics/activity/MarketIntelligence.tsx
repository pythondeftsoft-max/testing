import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRealTimeMarketIntelligence } from '@/hooks/useRealTimeMarketIntelligence';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Home, 
  MapPin,
  Target,
  Award,
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';

interface MarketIntelligenceProps {
  landlordId: string;
  portfolioId?: string;
}

interface MarketTrend {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface CompetitiveInsight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  landlordId,
  portfolioId
}) => {
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [competitiveInsights, setCompetitiveInsights] = useState<CompetitiveInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const { 
    portfolioIntelligence, 
    refreshMarketData, 
    isLoading: marketDataLoading 
  } = useRealTimeMarketIntelligence(portfolioId);

  // Generate market intelligence data
  useEffect(() => {
    setLoading(true);
    
    // Simulate market trends data
    const trends: MarketTrend[] = [
      {
        metric: 'Average Rent',
        value: 2350,
        change: 5.2,
        trend: 'up',
        description: 'Local rental prices increasing due to high demand'
      },
      {
        metric: 'Vacancy Rate',
        value: 3.8,
        change: -1.2,
        trend: 'down',
        description: 'Lower vacancy rates indicate strong rental market'
      },
      {
        metric: 'Days on Market',
        value: 12,
        change: -3,
        trend: 'down',
        description: 'Properties renting faster than market average'
      },
      {
        metric: 'Market Score',
        value: 8.4,
        change: 0.6,
        trend: 'up',
        description: 'Overall market conditions improving'
      }
    ];

    const insights: CompetitiveInsight[] = [
      {
        title: 'Rent Optimization Opportunity',
        description: 'Your properties are priced 8% below market average. Consider rent increases for 3 units.',
        impact: 'high',
        actionable: true
      },
      {
        title: 'Competitive Amenities Gap',
        description: '67% of nearby properties offer in-unit laundry. This could be limiting your rental appeal.',
        impact: 'medium',
        actionable: true
      },
      {
        title: 'Market Positioning Advantage',
        description: 'Your vacancy rates are 40% lower than area average, indicating strong tenant satisfaction.',
        impact: 'low',
        actionable: false
      },
      {
        title: 'Investment Expansion Opportunity',
        description: 'Properties within 2 miles showing strong appreciation trends. Consider expansion.',
        impact: 'high',
        actionable: true
      }
    ];

    setMarketTrends(trends);
    setCompetitiveInsights(insights);
    setLoading(false);
  }, [portfolioId]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  if (loading || marketDataLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketTrends.map((trend, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {trend.metric}
                </div>
                {getTrendIcon(trend.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {trend.metric.toLowerCase().includes('rate') || trend.metric.toLowerCase().includes('score') 
                    ? trend.value.toFixed(1) 
                    : trend.metric.toLowerCase().includes('rent') 
                      ? `$${trend.value.toLocaleString()}`
                      : trend.value
                  }
                  {trend.metric.toLowerCase().includes('rate') ? '%' : ''}
                </div>
                <div className={`text-sm ${getTrendColor(trend.trend)}`}>
                  {trend.change > 0 ? '+' : ''}{trend.change}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {trend.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio Market Intelligence */}
      {portfolioIntelligence && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Portfolio Market Performance
              <Button onClick={refreshMarketData} variant="outline" size="sm" className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  ${portfolioIntelligence.totalValue?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Home className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {portfolioIntelligence.assetAnalyses?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Properties</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {((portfolioIntelligence.totalValue || 0) / Math.max((portfolioIntelligence.assetAnalyses?.length || 1), 1)).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Avg Property Value</div>
              </div>
            </div>

            {/* Market Summary */}
            {portfolioIntelligence.marketSummary && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Market Performance Summary
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {portfolioIntelligence.marketSummary.topGainer && (
                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Top Performer</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {portfolioIntelligence.marketSummary.topGainer.symbol}
                      </div>
                      <div className="text-green-600 font-medium">
                        +{(portfolioIntelligence.marketSummary.topGainer as any)?.changePercent?.toFixed(2) || 0}%
                      </div>
                    </div>
                  )}
                  {portfolioIntelligence.marketSummary.topLoser && (
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-sm">Needs Attention</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {portfolioIntelligence.marketSummary.topLoser.symbol}
                      </div>
                      <div className="text-red-600 font-medium">
                        {(portfolioIntelligence.marketSummary.topLoser as any)?.changePercent?.toFixed(2) || 0}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Competitive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Competitive Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {competitiveInsights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getImpactColor(insight.impact)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium">{insight.title}</div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {insight.impact} impact
                  </Badge>
                  {insight.actionable && (
                    <Badge variant="outline" className="text-xs">
                      Actionable
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{insight.description}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Market Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Market Competitiveness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-2xl font-bold text-blue-600">8.4/10</span>
            </div>
            <Progress value={84} className="w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium mb-1">Pricing</div>
                <Progress value={75} className="mb-1" />
                <div className="text-muted-foreground">Competitive rates</div>
              </div>
              <div>
                <div className="font-medium mb-1">Location</div>
                <Progress value={90} className="mb-1" />
                <div className="text-muted-foreground">Prime locations</div>
              </div>
              <div>
                <div className="font-medium mb-1">Amenities</div>
                <Progress value={65} className="mb-1" />
                <div className="text-muted-foreground">Room for improvement</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketIntelligence;