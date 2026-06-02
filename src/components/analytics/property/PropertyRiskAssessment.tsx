import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, TrendingDown, Users, DollarSign, Calendar, MapPin, Zap } from 'lucide-react';

interface PropertyRiskAssessmentProps {
  portfolioId: string;
  currentUserId: string;
  properties: any[];
}

export const PropertyRiskAssessment: React.FC<PropertyRiskAssessmentProps> = ({
  portfolioId,
  currentUserId,
  properties
}) => {
  // Calculate risk scores for each property
  const getPropertyRisks = (property: any) => {
    const units = property.property_units || [];
    const occupancyRate = units.length > 0 ? 
      (units.filter((u: any) => u.status === 'occupied').length / units.length) * 100 : 0;
    
    // Vacancy Risk (higher when occupancy is low)
    const vacancyRisk = Math.max(0, 100 - occupancyRate);
    
    // Maintenance Risk (simplified calculation based on property age/condition)
    const maintenanceRisk = Math.floor(Math.random() * 40) + 20; // Mock data
    
    // Financial Risk (based on rent vs market rates)
    const financialRisk = Math.floor(Math.random() * 30) + 15; // Mock data
    
    // Tenant Retention Risk
    const tenantRisk = Math.floor(Math.random() * 35) + 10; // Mock data
    
    // Overall Risk Score (weighted average)
    const overallRisk = Math.round(
      (vacancyRisk * 0.3) + 
      (maintenanceRisk * 0.25) + 
      (financialRisk * 0.25) + 
      (tenantRisk * 0.2)
    );

    return {
      vacancy: vacancyRisk,
      maintenance: maintenanceRisk,
      financial: financialRisk,
      tenant: tenantRisk,
      overall: overallRisk
    };
  };

  const propertiesWithRisk = properties.map(property => ({
    ...property,
    risks: getPropertyRisks(property)
  })).sort((a, b) => b.risks.overall - a.risks.overall);

  const highRiskProperties = propertiesWithRisk.filter(p => p.risks.overall >= 60);
  const mediumRiskProperties = propertiesWithRisk.filter(p => p.risks.overall >= 40 && p.risks.overall < 60);
  const lowRiskProperties = propertiesWithRisk.filter(p => p.risks.overall < 40);

  const getRiskColor = (score: number) => {
    if (score >= 70) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'bg-red-100' };
    if (score >= 40) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'bg-amber-100' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'bg-green-100' };
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return { label: 'High Risk', variant: 'destructive' as const };
    if (score >= 40) return { label: 'Medium Risk', variant: 'secondary' as const };
    return { label: 'Low Risk', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">High Risk</p>
                <p className="text-2xl font-bold text-red-900">{highRiskProperties.length}</p>
                <p className="text-xs text-red-600">Properties need attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">Medium Risk</p>
                <p className="text-2xl font-bold text-amber-900">{mediumRiskProperties.length}</p>
                <p className="text-xs text-amber-600">Monitor closely</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Low Risk</p>
                <p className="text-2xl font-bold text-green-900">{lowRiskProperties.length}</p>
                <p className="text-xs text-green-600">Performing well</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Risk Assessment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-blue">Property Risk Analysis</h3>
              <p className="text-sm text-navy-blue/70">Comprehensive risk assessment by property</p>
            </div>
          </div>

          <div className="space-y-4">
            {propertiesWithRisk.slice(0, 10).map((property) => {
              const colors = getRiskColor(property.risks.overall);
              const badge = getRiskBadge(property.risks.overall);
              
              return (
                <div key={property.id} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colors.icon}`}>
                        <MapPin className="h-4 w-4 text-current" />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${colors.text}`}>{property.address}</h4>
                        <p className="text-sm opacity-70">
                          {property.property_units?.length || 0} units
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <div className="text-right">
                        <div className={`font-bold ${colors.text}`}>{property.risks.overall}</div>
                        <div className="text-xs opacity-70">Risk Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Vacancy Risk</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span>{Math.round(property.risks.vacancy)}</span>
                        </div>
                        <Progress value={property.risks.vacancy} className="h-2" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Maintenance Risk</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span>{Math.round(property.risks.maintenance)}</span>
                        </div>
                        <Progress value={property.risks.maintenance} className="h-2" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Financial Risk</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span>{Math.round(property.risks.financial)}</span>
                        </div>
                        <Progress value={property.risks.financial} className="h-2" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Tenant Risk</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span>{Math.round(property.risks.tenant)}</span>
                        </div>
                        <Progress value={property.risks.tenant} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {property.risks.overall >= 60 && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <h5 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Risk Mitigation Recommendations
                      </h5>
                      <ul className="text-sm space-y-1 opacity-90">
                        {property.risks.vacancy >= 50 && (
                          <li>• Focus on tenant retention and marketing to reduce vacancy</li>
                        )}
                        {property.risks.maintenance >= 50 && (
                          <li>• Schedule preventive maintenance and inspect high-wear items</li>
                        )}
                        {property.risks.financial >= 40 && (
                          <li>• Review rent pricing against market rates</li>
                        )}
                        {property.risks.tenant >= 40 && (
                          <li>• Improve tenant communication and satisfaction programs</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risk Categories Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Top Risk Factors</h3>
                <p className="text-sm text-navy-blue/70">Most common risk areas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Vacancy Risk</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-800">
                    {highRiskProperties.filter(p => p.risks.vacancy >= 50).length}
                  </div>
                  <div className="text-xs text-red-600">properties affected</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Maintenance Risk</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-800">
                    {propertiesWithRisk.filter(p => p.risks.maintenance >= 50).length}
                  </div>
                  <div className="text-xs text-amber-600">properties affected</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Financial Risk</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-800">
                    {propertiesWithRisk.filter(p => p.risks.financial >= 40).length}
                  </div>
                  <div className="text-xs text-orange-600">properties affected</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Risk Management Actions</h3>
                <p className="text-sm text-navy-blue/70">Recommended next steps</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="font-medium text-blue-900">Immediate Actions</div>
                <div className="text-sm text-blue-700 mt-1">
                  {highRiskProperties.length} properties need immediate attention
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                <div className="font-medium text-amber-900">Monitor Closely</div>
                <div className="text-sm text-amber-700 mt-1">
                  {mediumRiskProperties.length} properties require increased monitoring
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="font-medium text-green-900">Maintain Current Performance</div>
                <div className="text-sm text-green-700 mt-1">
                  {lowRiskProperties.length} properties are performing well
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};