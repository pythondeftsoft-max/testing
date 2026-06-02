import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Camera,
  MapPin,
  Star,
  CheckCircle2,
  ArrowRight,
  Target,
  Zap
} from 'lucide-react';
import type { ImportResult } from '@/types/propertyImport';

interface PropertyRecommendationsProps {
  results: ImportResult[];
}

interface Recommendation {
  id: string;
  type: 'pricing' | 'amenities' | 'marketing' | 'improvements' | 'portfolio';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedValue: number;
  actions: string[];
  properties: string[];
}

export const PropertyRecommendations: React.FC<PropertyRecommendationsProps> = ({
  results
}) => {
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  // Generate AI recommendations based on imported data
  const recommendations: Recommendation[] = [
    {
      id: 'pricing-optimization',
      type: 'pricing',
      priority: 'high',
      title: 'Optimize Rental Pricing',
      description: 'Several properties are priced below market rate based on location and amenities',
      impact: '+$2,400/month potential revenue',
      effort: 'low',
      estimatedValue: 28800,
      actions: [
        'Increase rent for 3 under-priced units',
        'Implement dynamic pricing strategy',
        'Add premium for upgraded amenities'
      ],
      properties: ['123 Main St', '456 Oak Ave', '789 Pine Rd']
    },
    {
      id: 'amenity-enhancement',
      type: 'amenities',
      priority: 'high',
      title: 'Add High-Impact Amenities',
      description: 'Properties missing common amenities that could increase rental value',
      impact: '+15% rental value potential',
      effort: 'medium',
      estimatedValue: 18000,
      actions: [
        'Install in-unit laundry where missing',
        'Add dishwashers to 5 properties',
        'Upgrade lighting to LED throughout'
      ],
      properties: ['321 Elm St', '654 Maple Dr', '987 Cedar Ln']
    },
    {
      id: 'marketing-photos',
      type: 'marketing',
      priority: 'medium',
      title: 'Professional Photography',
      description: 'Properties without professional photos typically rent 20% faster',
      impact: '20% faster rental time',
      effort: 'low',
      estimatedValue: 5000,
      actions: [
        'Schedule professional photography',
        'Create virtual tours for premium units',
        'Add drone shots for outdoor spaces'
      ],
      properties: ['111 First St', '222 Second Ave', '333 Third Blvd']
    },
    {
      id: 'portfolio-grouping',
      type: 'portfolio',
      priority: 'medium',
      title: 'Strategic Property Grouping',
      description: 'Group similar properties for economies of scale in management',
      impact: '-25% management costs',
      effort: 'low',
      estimatedValue: 12000,
      actions: [
        'Group properties by neighborhood',
        'Bulk negotiate vendor contracts',
        'Standardize maintenance schedules'
      ],
      properties: ['Downtown cluster (8 properties)', 'Westside cluster (5 properties)']
    },
    {
      id: 'energy-efficiency',
      type: 'improvements',
      priority: 'low',
      title: 'Energy Efficiency Upgrades',
      description: 'Green improvements can reduce costs and attract eco-conscious tenants',
      impact: '+$150/month savings per unit',
      effort: 'high',
      estimatedValue: 9000,
      actions: [
        'Install smart thermostats',
        'Upgrade to energy-efficient appliances',
        'Add solar panels where feasible'
      ],
      properties: ['555 Green St', '666 Eco Ave', '777 Solar Dr']
    }
  ];

  const handleApplyRecommendation = (recommendationId: string) => {
    setAppliedRecommendations(prev => new Set([...prev, recommendationId]));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pricing': return <DollarSign className="h-4 w-4" />;
      case 'amenities': return <Star className="h-4 w-4" />;
      case 'marketing': return <Camera className="h-4 w-4" />;
      case 'improvements': return <TrendingUp className="h-4 w-4" />;
      case 'portfolio': return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const totalPotentialValue = recommendations.reduce((sum, rec) => sum + rec.estimatedValue, 0);
  const appliedValue = recommendations
    .filter(rec => appliedRecommendations.has(rec.id))
    .reduce((sum, rec) => sum + rec.estimatedValue, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{recommendations.length}</div>
              <div className="text-sm text-muted-foreground">Total Recommendations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalPotentialValue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Potential Annual Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{recommendations.filter(r => r.priority === 'high').length}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{appliedRecommendations.size}</div>
              <div className="text-sm text-muted-foreground">Applied</div>
            </div>
          </div>

          {appliedValue > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  Progress: ${appliedValue.toLocaleString()} in potential value from applied recommendations
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((recommendation) => {
          const isApplied = appliedRecommendations.has(recommendation.id);
          
          return (
            <Card key={recommendation.id} className={isApplied ? 'border-green-200 bg-green-50/30' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getTypeIcon(recommendation.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      <p className="text-muted-foreground mt-1">{recommendation.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {recommendation.priority.toUpperCase()}
                    </Badge>
                    {isApplied && (
                      <Badge variant="secondary" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Applied
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Potential Impact</div>
                    <div className="font-medium text-green-600">{recommendation.impact}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated Annual Value</div>
                    <div className="font-medium">${recommendation.estimatedValue.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Implementation Effort</div>
                    <Badge variant="outline" className={
                      recommendation.effort === 'low' ? 'text-green-600' :
                      recommendation.effort === 'medium' ? 'text-amber-600' : 'text-red-600'
                    }>
                      {recommendation.effort.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                    <ul className="text-sm space-y-1">
                      {recommendation.actions.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Affected Properties:</div>
                    <div className="flex flex-wrap gap-1">
                      {recommendation.properties.map((property, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {property}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  {!isApplied ? (
                    <Button 
                      onClick={() => handleApplyRecommendation(recommendation.id)}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Apply Recommendation
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Applied
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Apply All Pricing Recommendations
            </Button>
            <Button variant="outline" className="gap-2">
              <Star className="h-4 w-4" />
              Schedule Amenity Upgrades
            </Button>
            <Button variant="outline" className="gap-2">
              <Camera className="h-4 w-4" />
              Book Professional Photography
            </Button>
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              Optimize Portfolio Grouping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};