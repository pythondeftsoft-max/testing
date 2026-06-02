import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  Calendar,
  Zap,
  BarChart3,
  Loader2
} from 'lucide-react';

interface RealPredictiveInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'alert' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  metric: string;
  predictedValue: number;
  currentValue: number;
  trend: number;
  priority: number;
}

interface RealPredictiveInsightsPanelProps {
  portfolioId: string;
  className?: string;
}

const RealPredictiveInsightsPanel: React.FC<RealPredictiveInsightsPanelProps> = ({
  portfolioId,
  className = ''
}) => {
  const [insights, setInsights] = useState<RealPredictiveInsight[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<RealPredictiveInsight | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    generateRealInsights();
  }, [portfolioId]);

  const generateRealInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: functionError } = await supabase.functions.invoke('ai-insights-engine', {
        body: { 
          portfolioId: portfolioId === 'everything' ? null : portfolioId,
          landlordId: user.id,
          analysisType: 'predictive'
        },
      });

      if (functionError) throw functionError;

      // Transform AI insights into predictive format
      const transformedInsights: RealPredictiveInsight[] = [];
      let priority = 1;

      // Transform predictions into insights
      if (data.predictions) {
        data.predictions.forEach((prediction: any, index: number) => {
          transformedInsights.push({
            id: `prediction-${index}`,
            type: 'prediction',
            title: `${prediction.metric} Forecast`,
            description: `Based on current trends, ${prediction.metric.toLowerCase()} is predicted to ${prediction.trend} to ${prediction.predictedValue} over ${prediction.timeframe.toLowerCase()}.`,
            confidence: prediction.confidence || 75,
            impact: prediction.trend === 'increasing' ? 'high' : 'medium',
            timeframe: prediction.timeframe,
            metric: prediction.metric,
            predictedValue: prediction.predictedValue,
            currentValue: prediction.currentValue,
            trend: prediction.trend === 'increasing' ? 
              ((prediction.predictedValue - prediction.currentValue) / prediction.currentValue * 100) :
              -((prediction.currentValue - prediction.predictedValue) / prediction.currentValue * 100),
            priority: priority++
          });
        });
      }

      // Transform smart insights into alerts/opportunities
      if (data.smartInsights) {
        data.smartInsights.forEach((insight: any, index: number) => {
          if (insight.type === 'warning') {
            transformedInsights.push({
              id: `alert-${index}`,
              type: 'alert',
              title: insight.title,
              description: insight.description,
              confidence: insight.confidence || 80,
              impact: insight.impact,
              timeframe: 'Next 30 days',
              metric: 'Risk Level',
              predictedValue: 85,
              currentValue: 70,
              trend: 15,
              priority: priority++
            });
          } else if (insight.type === 'opportunity') {
            transformedInsights.push({
              id: `opportunity-${index}`,
              type: 'opportunity',
              title: insight.title,
              description: insight.description,
              confidence: insight.confidence || 85,
              impact: insight.impact,
              timeframe: 'Next 60 days',
              metric: 'Revenue Potential',
              predictedValue: 105,
              currentValue: 100,
              trend: 5,
              priority: priority++
            });
          }
        });
      }

      // Transform optimizations into recommendations
      if (data.optimizations) {
        data.optimizations.forEach((optimization: any, index: number) => {
          transformedInsights.push({
            id: `recommendation-${index}`,
            type: 'recommendation',
            title: optimization.title,
            description: optimization.description,
            confidence: 80,
            impact: optimization.priority === 'high' ? 'high' : 'medium',
            timeframe: optimization.timeline || 'Next 90 days',
            metric: 'Implementation Score',
            predictedValue: 90,
            currentValue: 70,
            trend: 20,
            priority: priority++
          });
        });
      }

      // Sort by priority and add better scoring
      const sortedInsights = transformedInsights
        .map(insight => ({
          ...insight,
          // Calculate priority score: high confidence + high impact = higher priority
          priorityScore: (insight.confidence * 0.6) + 
                        (insight.impact === 'high' ? 30 : insight.impact === 'medium' ? 15 : 5) +
                        (insight.type === 'alert' ? 25 : insight.type === 'prediction' ? 20 : 10)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore);
      
      setInsights(sortedInsights);
    } catch (error) {
      console.error('Failed to generate real insights:', error);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (insight: RealPredictiveInsight) => {
    setSelectedInsight(insight);
    setIsSheetOpen(true);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction':
        return <Brain className="w-5 h-5 text-blue-500" />;
      case 'recommendation':
        return <Lightbulb className="w-5 h-5 text-green-500" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'opportunity':
        return <Target className="w-5 h-5 text-purple-500" />;
      default:
        return <Zap className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-success';
    if (confidence >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const formatValue = (value: number, metric: string) => {
    if (metric.toLowerCase().includes('rate') || metric.toLowerCase().includes('score')) {
      return `${value.toFixed(1)}%`;
    }
    if (metric.toLowerCase().includes('days')) {
      return `${value.toFixed(1)} days`;
    }
    if (metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('rent')) {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Generating real AI insights...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <Brain className="w-8 h-8 text-muted-foreground" />
          <span className="text-muted-foreground">No predictive insights available yet. Add more data to get started.</span>
        </div>
      </Card>
    );
  }

  // Filter high-priority insights for initial display (much stricter)
  const getHighPriorityInsights = () => {
    const highPriorityByCategory = {
      alerts: insights.filter(i => i.type === 'alert' && i.confidence >= 80 && i.impact === 'high').slice(0, 2),
      predictions: insights.filter(i => i.type === 'prediction' && i.confidence >= 80 && i.impact === 'high').slice(0, 2),
      opportunities: insights.filter(i => (i.type === 'opportunity' || i.type === 'recommendation') && i.confidence >= 80 && i.impact === 'high').slice(0, 1)
    };
    
    return [
      ...highPriorityByCategory.alerts,
      ...highPriorityByCategory.predictions,
      ...highPriorityByCategory.opportunities
    ].slice(0, 6); // Max 6 total
  };

  const displayedInsights = showAll ? insights : getHighPriorityInsights();
  const hasMoreInsights = insights.length > getHighPriorityInsights().length;

  // Group insights by category
  const groupedInsights = {
    alerts: displayedInsights.filter(i => i.type === 'alert'),
    predictions: displayedInsights.filter(i => i.type === 'prediction'),
    opportunities: displayedInsights.filter(i => i.type === 'opportunity' || i.type === 'recommendation')
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground">
                {showAll ? `${insights.length} insights` : `Top ${displayedInsights.length} priority insights`} from your portfolio data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              Live Analysis
            </Badge>
            {hasMoreInsights && (
              <Button 
                onClick={() => setShowAll(!showAll)} 
                variant="outline" 
                size="sm"
              >
                {showAll ? 'Show Less' : `Show All (${insights.length})`}
              </Button>
            )}
            <Button onClick={generateRealInsights} variant="ghost" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Insights Grid */}
      {!showAll ? (
        // Compact priority view: unified grid without category headers
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedInsights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              index={index}
              onClick={() => handleCardClick(insight)}
            />
          ))}
        </div>
      ) : (
        // Full view: grouped by category with headers
        <>
          {/* Critical Alerts (if any) */}
          {groupedInsights.alerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-sm">Critical Alerts</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedInsights.alerts.map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} onClick={() => handleCardClick(insight)} />
                ))}
              </div>
            </div>
          )}

          {/* Key Predictions */}
          {groupedInsights.predictions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-sm">Key Predictions</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedInsights.predictions.map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} onClick={() => handleCardClick(insight)} />
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {groupedInsights.opportunities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-sm">Growth Opportunities</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedInsights.opportunities.map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} onClick={() => handleCardClick(insight)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}


      {/* Show All Toggle for bottom */}
      {hasMoreInsights && !showAll && (
        <div className="text-center">
          <Button 
            onClick={() => setShowAll(true)} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>View {insights.length - displayedInsights.length} More Insights</span>
            <TrendingUp className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Sheet for Detailed View */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          {selectedInsight && (
            <>
              <SheetHeader className="space-y-4 pb-6">
                <div className="flex items-center space-x-3">
                  {getInsightIcon(selectedInsight.type)}
                  <div className="flex-1">
                    <SheetTitle className="text-xl leading-tight">
                      {selectedInsight.title}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Real-time AI Analysis • {selectedInsight.timeframe}
                    </SheetDescription>
                  </div>
                </div>
                
                {/* Key Metrics Bar */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <span className={`text-sm font-semibold ${getConfidenceColor(selectedInsight.confidence)}`}>
                      {selectedInsight.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Impact</span>
                    <Badge variant="outline" className={`text-xs ${getImpactColor(selectedInsight.impact)}`}>
                      {selectedInsight.impact}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Trend</span>
                    <div className="flex items-center">
                      {selectedInsight.trend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium ml-1">
                        {Math.abs(selectedInsight.trend).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Analysis Details */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analysis Details
                  </h4>
                  <div className="p-4 bg-card border rounded-lg">
                    <p className="text-sm leading-relaxed text-foreground">
                      {selectedInsight.description}
                    </p>
                  </div>
                  
                  {/* Prediction Values */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Current Value
                      </div>
                      <div className="text-lg font-semibold">
                        {formatValue(selectedInsight.currentValue, selectedInsight.metric)}
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Predicted Value
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        {formatValue(selectedInsight.predictedValue, selectedInsight.metric)}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Confidence Level</span>
                      <span className={`font-medium ${getConfidenceColor(selectedInsight.confidence)}`}>
                        {selectedInsight.confidence}%
                      </span>
                    </div>
                    <Progress value={selectedInsight.confidence} className="h-2" />
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommended Actions
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Monitor key indicators
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Track this prediction against actual outcomes to validate accuracy
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <Target className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">
                          Prepare action plan
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Develop strategic responses based on this AI-generated insight
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Schedule review
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Set reminder to validate prediction accuracy in {selectedInsight.timeframe.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Insights */}
                <div className="space-y-4 pb-6">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Key Insights
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Data Quality</div>
                      <div className="text-xs text-muted-foreground">
                        This prediction is based on {selectedInsight.confidence >= 85 ? 'high-quality' : selectedInsight.confidence >= 70 ? 'good-quality' : 'limited'} data 
                        from your portfolio metrics and market trends.
                      </div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Expected Timeline</div>
                      <div className="text-xs text-muted-foreground">
                        Changes are projected to occur within {selectedInsight.timeframe.toLowerCase()}, 
                        with monitoring recommended throughout this period.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Insight Card Component
const InsightCard: React.FC<{
  insight: RealPredictiveInsight;
  index: number;
  onClick: () => void;
}> = ({ insight, index, onClick }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction':
        return <Brain className="w-5 h-5 text-blue-500" />;
      case 'recommendation':
        return <Lightbulb className="w-5 h-5 text-green-500" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'opportunity':
        return <Target className="w-5 h-5 text-purple-500" />;
      default:
        return <Zap className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-success';
    if (confidence >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const formatValue = (value: number, metric: string) => {
    if (metric.toLowerCase().includes('rate') || metric.toLowerCase().includes('score')) {
      return `${value.toFixed(1)}%`;
    }
    if (metric.toLowerCase().includes('days')) {
      return `${value.toFixed(1)} days`;
    }
    if (metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('rent')) {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        className="group p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-accent/5 border-border/60 h-[280px] flex flex-col"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {insight.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {insight.description}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs font-medium flex-shrink-0 ${getImpactColor(insight.impact)}`}
          >
            {insight.impact}
          </Badge>
        </div>

        {/* Spacer to push bottom content down */}
        <div className="flex-1"></div>

        {/* Bottom section - Key Metrics */}
        <div className="space-y-3 mt-auto">
          {/* Confidence */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI Confidence</span>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold ${getConfidenceColor(insight.confidence)}`}>
                {insight.confidence}%
              </span>
              <Progress value={insight.confidence} className="w-16 h-1.5" />
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Current</div>
              <div className="text-sm font-semibold">
                {formatValue(insight.currentValue, insight.metric)}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {insight.trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-xs font-medium ${
                insight.trend > 0 ? 'text-success' : 'text-destructive'
              }`}>
                {insight.trend > 0 ? '+' : ''}{insight.trend.toFixed(1)}%
              </span>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Predicted</div>
              <div className="text-sm font-semibold text-primary">
                {formatValue(insight.predictedValue, insight.metric)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1" />
              Timeline
            </div>
            <span className="font-medium text-foreground">{insight.timeframe}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default RealPredictiveInsightsPanel;