import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Target, Star, AlertTriangle } from 'lucide-react';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';

interface PropertyPerformanceBreakdownProps {
  portfolioId: string;
  currentUserId: string;
  properties: any[];
}

export const PropertyPerformanceBreakdown: React.FC<PropertyPerformanceBreakdownProps> = ({
  portfolioId,
  currentUserId,
  properties
}) => {
  const { data: analytics } = useEnhancedLandlordAnalytics(currentUserId, portfolioId);

  // Calculate property performance scores
  const getPropertyScore = (property: any) => {
    const units = property.property_units || [];
    const occupancyRate = units.length > 0 ? 
      (units.filter((u: any) => u.status === 'occupied').length / units.length) * 100 : 0;
    
    const revenueScore = occupancyRate * 0.4;
    const maintenanceScore = 30; // Simplified scoring
    const tenantScore = 25; // Simplified scoring
    
    return Math.round(revenueScore + maintenanceScore + tenantScore);
  };

  // Rank properties by performance
  const rankedProperties = properties
    .map(property => ({
      ...property,
      score: getPropertyScore(property),
      monthlyRevenue: property.property_units?.reduce((sum: number, unit: any) => 
        sum + (unit.monthly_rent || 0), 0) || 0,
      occupancyRate: property.property_units?.length > 0 ? 
        (property.property_units.filter((u: any) => u.status === 'occupied').length / 
         property.property_units.length) * 100 : 0
    }))
    .sort((a, b) => b.score - a.score);

  const topPerformers = rankedProperties.slice(0, 3);
  const underPerformers = rankedProperties.slice(-3).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performing Properties */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Top Performers</h3>
              <p className="text-sm text-green-700">Highest scoring properties</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {topPerformers.map((property, index) => (
              <div key={property.id} className="bg-white/80 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-green-100 text-green-800 border-green-200"
                    >
                      #{index + 1}
                    </Badge>
                    <span className="font-medium text-green-900">{property.address}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-800">{property.score}</span>
                    <span className="text-sm text-green-600">/100</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-green-700 mb-1">Monthly Revenue</div>
                    <div className="font-semibold text-green-900">
                      ${property.monthlyRevenue?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700 mb-1">Occupancy</div>
                    <div className="font-semibold text-green-900">
                      {Math.round(property.occupancyRate)}%
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance Score</span>
                    <span>{property.score}/100</span>
                  </div>
                  <Progress value={property.score} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Underperforming Properties */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Needs Attention</h3>
              <p className="text-sm text-amber-700">Properties requiring improvement</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {underPerformers.map((property, index) => (
              <div key={property.id} className="bg-white/80 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-amber-100 text-amber-800 border-amber-200"
                    >
                      Rank #{rankedProperties.length - index}
                    </Badge>
                    <span className="font-medium text-amber-900">{property.address}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-amber-800">{property.score}</span>
                    <span className="text-sm text-amber-600">/100</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-amber-700 mb-1">Monthly Revenue</div>
                    <div className="font-semibold text-amber-900">
                      ${property.monthlyRevenue?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-amber-700 mb-1">Occupancy</div>
                    <div className="font-semibold text-amber-900">
                      {Math.round(property.occupancyRate)}%
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance Score</span>
                    <span>{property.score}/100</span>
                  </div>
                  <Progress value={property.score} className="h-2" />
                </div>
                
                <div className="mt-3 p-3 bg-amber-100/50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    💡 Focus on improving occupancy and reducing maintenance costs
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property Comparison Matrix */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-blue">Property Performance Matrix</h3>
              <p className="text-sm text-navy-blue/70">Comparative analysis of all properties</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-navy-blue">Property</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Score</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Revenue</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Occupancy</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Units</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rankedProperties.slice(0, 10).map((property, index) => (
                  <tr key={property.id} className="border-b border-gray-100">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="w-8 h-6 flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{property.address}</span>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">{property.score}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-medium">
                        ${property.monthlyRevenue?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-medium">
                        {Math.round(property.occupancyRate)}%
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span>{property.property_units?.length || 0}</span>
                    </td>
                    <td className="text-center p-3">
                      {property.score >= 70 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};