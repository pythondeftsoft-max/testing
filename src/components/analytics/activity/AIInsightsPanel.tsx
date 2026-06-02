import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAIInsights } from '@/hooks/useAIInsights';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, RefreshCw } from 'lucide-react';

interface AIInsightsPanelProps {
  landlordId: string;
  portfolioId?: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  landlordId,
  portfolioId
}) => {
  const { insights, loading, error, refetch } = useAIInsights(landlordId, portfolioId);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load AI insights</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const recommendations = insights?.recommendations || [];
  const predictions = insights?.predictions || [];
  const risks = insights?.risks || [];
  const opportunities = insights?.opportunities || [];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI-Powered Insights</h3>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Key Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-600" />
              Key Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{rec.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{rec.description}</div>
                  {rec.estimated_impact && (
                    <Badge variant="secondary" className="mt-2">
                      {rec.estimated_impact} impact
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Market Predictions */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Market Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.slice(0, 2).map((pred, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{pred.type}</div>
                  <div className="text-sm text-muted-foreground mt-1">{pred.description}</div>
                  {pred.confidence && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {pred.confidence}% confidence
                      </Badge>
                      {pred.timeframe_days && (
                        <Badge variant="outline" className="text-xs">
                          {pred.timeframe_days} days
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Alerts */}
      {risks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.slice(0, 2).map((risk, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{risk.type}</div>
                  <div className="text-sm text-muted-foreground mt-1">{risk.description}</div>
                  {risk.severity && (
                    <Badge 
                      variant={risk.severity === 'high' ? 'destructive' : 'secondary'} 
                      className="mt-2"
                    >
                      {risk.severity} risk
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-purple-600" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.slice(0, 2).map((opp, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{opp.type}</div>
                  <div className="text-sm text-muted-foreground mt-1">{opp.description}</div>
                  {opp.potential_value && (
                    <Badge variant="outline" className="mt-2">
                      +${opp.potential_value} potential
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!insights && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium mb-2">AI Insights Loading</h3>
            <p className="text-muted-foreground">
              Our AI is analyzing your portfolio to provide personalized insights and recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsightsPanel;