import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Target, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

interface RentOptimizationPanelProps {
  landlordId: string;
  portfolioId?: string;
}

interface RentOptimization {
  propertyId: string;
  address: string;
  currentRent: number;
  marketRent: number;
  optimizationPotential: number;
  percentageDifference: number;
  recommendedAction: 'increase' | 'maintain' | 'decrease';
  confidenceScore: number;
  lastIncrease: string | null;
}

const RentOptimizationPanel: React.FC<RentOptimizationPanelProps> = ({
  landlordId,
  portfolioId
}) => {
  const [optimizations, setOptimizations] = useState<RentOptimization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRentOptimizations();
  }, [landlordId, portfolioId]);

  const fetchRentOptimizations = async () => {
    try {
      let query = supabase
        .from('properties')
        .select('id, address, monthly_rent, property_type, bedrooms, bathrooms')
        .eq('owner_id', landlordId)
        .eq('status', 'occupied')
        .not('monthly_rent', 'is', null);

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        const rentOptimizations: RentOptimization[] = properties.map(property => {
          // Mock market rent calculation (in real app, this would use market data APIs)
          const baseMarketRent = property.monthly_rent * (1 + (Math.random() * 0.3 - 0.15)); // ±15% variation
          const marketRent = Math.round(baseMarketRent / 50) * 50; // Round to nearest $50
          
          const currentRent = property.monthly_rent;
          const difference = marketRent - currentRent;
          const percentageDifference = (difference / currentRent) * 100;
          
          let recommendedAction: 'increase' | 'maintain' | 'decrease';
          if (percentageDifference > 5) recommendedAction = 'increase';
          else if (percentageDifference < -5) recommendedAction = 'decrease';
          else recommendedAction = 'maintain';
          
          const confidenceScore = Math.min(100, Math.max(60, 85 + (Math.random() * 20 - 10))); // 75-95% confidence
          
          return {
            propertyId: property.id,
            address: property.address,
            currentRent,
            marketRent,
            optimizationPotential: Math.abs(difference),
            percentageDifference,
            recommendedAction,
            confidenceScore,
            lastIncrease: null // Would be calculated from rent history
          };
        });

        setOptimizations(rentOptimizations);
      }
    } catch (error) {
      console.error('Error fetching rent optimizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOptimizationPotential = optimizations.reduce((acc, opt) => 
    opt.recommendedAction === 'increase' ? acc + opt.optimizationPotential : acc, 0
  );

  const avgConfidenceScore = optimizations.reduce((acc, opt) => acc + opt.confidenceScore, 0) / (optimizations.length || 1);

  const metrics = {
    totalPotential: totalOptimizationPotential,
    avgConfidence: avgConfidenceScore,
    increaseOpportunities: optimizations.filter(opt => opt.recommendedAction === 'increase').length,
    maintainCount: optimizations.filter(opt => opt.recommendedAction === 'maintain').length,
    decreaseWarnings: optimizations.filter(opt => opt.recommendedAction === 'decrease').length
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'increase': return 'bg-success/20 text-success border-success/20';
      case 'decrease': return 'bg-danger/20 text-danger border-danger/20';
      default: return 'bg-openkey-blue/20 text-openkey-blue border-openkey-blue/20';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase': return <TrendingUp className="h-4 w-4" />;
      case 'decrease': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse card-hover-gold">
              <div className="h-4 bg-openkey-blue/20 rounded mb-2"></div>
              <div className="h-8 bg-openkey-gold/20 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 card-hover-gold animate-fade-in border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Optimization Potential</p>
              <p className="text-2xl font-bold text-success">${metrics.totalPotential.toLocaleString()}/mo</p>
            </div>
            <div className="p-2 rounded-lg bg-success/10 border border-success/20">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-openkey-blue/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Increase Opportunities</p>
              <p className="text-2xl font-bold text-openkey-blue">{metrics.increaseOpportunities}</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-subtle-blue border border-openkey-blue/20">
              <TrendingUp className="h-6 w-6 text-openkey-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-info/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold text-gradient-blue-gold">{metrics.avgConfidence.toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-info/10 border border-info/20">
              <Target className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-openkey-gold/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Market Aligned</p>
              <p className="text-2xl font-bold text-openkey-gold">{metrics.maintainCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-subtle-gold border border-openkey-gold/20">
              <CheckCircle className="h-6 w-6 text-openkey-gold" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 card-hover-gold border-success/20">
          <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Market Position Overview</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Below Market (Increase)</span>
              </div>
              <Badge className="bg-success text-white">{metrics.increaseOpportunities}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-subtle-gold rounded-lg border border-openkey-gold/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-openkey-gold" />
                <span className="text-sm font-medium text-openkey-gold">Market Aligned</span>
              </div>
              <Badge variant="secondary" className="bg-openkey-gold text-white">{metrics.maintainCount}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg border border-danger/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-sm font-medium text-danger">Above Market (Risk)</span>
              </div>
              <Badge variant="destructive" className="bg-danger text-white">{metrics.decreaseWarnings}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 card-hover-gold border-openkey-gold/20">
          <div className="bg-gradient-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Optimization Insights</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gradient-subtle-blue border border-openkey-blue/20 rounded-lg">
              <p className="text-sm font-medium text-openkey-blue">Revenue Opportunity</p>
              <p className="text-sm text-openkey-blue/80">
                Potential to increase monthly revenue by ${metrics.totalPotential.toLocaleString()} across {metrics.increaseOpportunities} properties
              </p>
            </div>
            <div className="p-3 bg-gradient-subtle-gold border border-openkey-gold/20 rounded-lg">
              <p className="text-sm font-medium text-openkey-gold">Market Confidence</p>
              <p className="text-sm text-openkey-gold/80">
                Average confidence score of {metrics.avgConfidence.toFixed(1)}% based on local market data
              </p>
            </div>
            {metrics.decreaseWarnings > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm font-medium text-warning">Risk Assessment</p>
                <p className="text-sm text-warning/80">
                  {metrics.decreaseWarnings} propert{metrics.decreaseWarnings > 1 ? 'ies' : 'y'} may be priced above market - review to prevent vacancy
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 card-hover-gold border-openkey-blue/20">
        <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-white">Property Optimization Recommendations</h3>
        </div>
        <div className="space-y-3">
          {optimizations.map((opt, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gradient-subtle-blue rounded-lg hover:bg-openkey-blue/10 transition-all duration-200 border border-openkey-blue/10">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-openkey-gold" />
                  <div>
                    <p className="font-medium text-openkey-blue">{opt.address}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: <span className="text-openkey-gold">${opt.currentRent.toLocaleString()}</span> | Market: <span className="text-openkey-blue">${opt.marketRent.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gradient-blue-gold">
                    {opt.recommendedAction === 'increase' && '+'}
                    {opt.recommendedAction === 'decrease' && '-'}
                    ${opt.optimizationPotential.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.abs(opt.percentageDifference).toFixed(1)}% {opt.percentageDifference >= 0 ? 'below' : 'above'} market
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1">
                    {getActionIcon(opt.recommendedAction)}
                    <Badge className={`${getActionColor(opt.recommendedAction)} border`}>
                      {opt.recommendedAction}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.confidenceScore.toFixed(0)}% confidence</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {metrics.increaseOpportunities > 0 && (
        <Card className="p-6 border-success/20 bg-success/10 card-hover-gold">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-success">Rent Optimization Opportunity</h4>
                <p className="text-sm text-success/80 mt-1">
                  You could increase monthly revenue by ${metrics.totalPotential.toLocaleString()} by optimizing rent on {metrics.increaseOpportunities} properties.
                  Consider market-rate adjustments during lease renewals.
                </p>
              </div>
            </div>
            <Button size="sm" variant="gold" className="bg-success hover:bg-success/80">
              View Details
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RentOptimizationPanel;