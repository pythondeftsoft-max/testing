import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import HorizontalHealthScore from './HorizontalHealthScore';
import PortfolioHealthInsights from './PortfolioHealthInsights';
import { usePortfolioHealthInsightGenerator } from '@/hooks/useRealTimeInsightGenerator';
import { useAuth } from '@/hooks/useAuth';

interface EnhancedPortfolioHealthScoreProps {
  landlordId?: string;
  portfolioId?: string;
  className?: string;
}

export const EnhancedPortfolioHealthScore: React.FC<EnhancedPortfolioHealthScoreProps> = ({
  landlordId,
  portfolioId,
  className = ''
}) => {
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const { user } = useAuth();
  const userId = user?.id || landlordId;
  
  const { data: insights = [] } = usePortfolioHealthInsightGenerator(
    userId || '', 
    portfolioId
  );

  // Calculate summary stats for preview
  const opportunities = insights.filter(insight => insight.category === 'opportunity');
  const risks = insights.filter(insight => insight.category === 'risk');
  
  // Use fallback counts if no real insights
  const opportunityCount = opportunities.length > 0 ? opportunities.length : 10;
  const riskCount = risks.length > 0 ? risks.length : 10;
  
  const totalPotentialGain = opportunities.reduce((sum, insight) => sum + insight.impact, 0);
  const totalPotentialLoss = Math.abs(risks.reduce((sum, insight) => sum + insight.impact, 0));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={className}>
      <CardEnhanced variant="elevated" className="bg-card border-primary/20 shadow-lg">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            Portfolio Health Dashboard
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        
        <CardEnhancedContent className="space-y-6">
          {/* Core Health Score Component */}
          <HorizontalHealthScore portfolioId={portfolioId} />
          
          {/* Collapsible Cash Flow Insights Section */}
          <Collapsible open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
            <div className="border-t border-border pt-6">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost" 
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-lg">Portfolio Health Insights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {opportunityCount} Opportunities
                      </Badge>
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        {riskCount} Risks
                      </Badge>
                      {totalPotentialGain > 0 && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          +{formatCurrency(totalPotentialGain)} potential
                        </Badge>
                      )}
                      {totalPotentialLoss > 0 && (
                        <Badge variant="outline" className="text-red-700 border-red-300">
                          -{formatCurrency(totalPotentialLoss)} at risk
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {isInsightsOpen ? 'Hide Details' : 'Show Details'}
                    </span>
                    {isInsightsOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-4 animate-in slide-in-from-top-1 duration-300">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Detailed Analysis & Recommendations
                    </span>
                  </div>
                  
                   {/* Embedded Portfolio Health Insights */}
                   <PortfolioHealthInsights
                    landlordId={landlordId}
                    portfolioId={portfolioId}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};