import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
  potentialValue?: number;
}

interface AIInsightPanelProps {
  insights: AIInsight[];
  className?: string;
}

const getInsightIcon = (type: AIInsight['type']) => {
  switch (type) {
    case 'opportunity':
      return <TrendingUp className="h-4 w-4" />;
    case 'risk':
      return <AlertTriangle className="h-4 w-4" />;
    case 'recommendation':
      return <Lightbulb className="h-4 w-4" />;
    case 'alert':
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Brain className="h-4 w-4" />;
  }
};

const getInsightColor = (type: AIInsight['type'], impact: AIInsight['impact']) => {
  const baseColors = {
    opportunity: 'text-green-600 bg-green-50 border-green-200',
    risk: 'text-red-600 bg-red-50 border-red-200',
    recommendation: 'text-blue-600 bg-blue-50 border-blue-200',
    alert: 'text-amber-600 bg-amber-50 border-amber-200',
  };
  
  return baseColors[type] || baseColors.recommendation;
};

const getImpactColor = (impact: AIInsight['impact']) => {
  switch (impact) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
};

const formatValue = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  insights,
  className
}) => {
  // Sort insights by impact and confidence
  const sortedInsights = [...insights].sort((a, b) => {
    const impactWeight = { high: 3, medium: 2, low: 1 };
    const aScore = impactWeight[a.impact] * (a.confidence / 100);
    const bScore = impactWeight[b.impact] * (b.confidence / 100);
    return bScore - aScore;
  });

  return (
    <CardEnhanced className={cn("bg-white border-border/50", className)}>
      <CardEnhancedHeader className="pb-4">
        <CardEnhancedTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Brain className="h-5 w-5 text-primary" />
          AI Insights & Recommendations
          <Badge variant="outline" className="ml-2 text-xs">
            {insights.length} insights
          </Badge>
        </CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-4">
          {sortedInsights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No insights available at this time.</p>
              <p className="text-sm">Check back later for AI-generated recommendations.</p>
            </div>
          ) : (
            sortedInsights.map((insight) => (
              <div 
                key={insight.id}
                className="border border-border/50 rounded-lg p-4 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-md border",
                      getInsightColor(insight.type, insight.impact)
                    )}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs border", getImpactColor(insight.impact))}
                        >
                          {insight.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {insight.potentialValue && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {formatValue(insight.potentialValue)}
                      </div>
                      <div className="text-xs text-muted-foreground">potential value</div>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {insight.description}
                </p>
                
                {insight.actionable && insight.suggestedAction && (
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">Suggested Action:</span>
                      <span>{insight.suggestedAction}</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      Act on this
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};