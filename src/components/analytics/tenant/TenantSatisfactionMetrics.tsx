import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, MessageSquare, Wrench, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface TenantSatisfactionMetricsProps {
  landlordId: string;
  portfolioId?: string;
}

interface SatisfactionData {
  propertyId: string;
  address: string;
  tenantName: string;
  communicationScore: number;
  maintenanceScore: number;
  responseTime: number;
  overallSatisfaction: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastInteraction: string;
}

const TenantSatisfactionMetrics: React.FC<TenantSatisfactionMetricsProps> = ({
  landlordId,
  portfolioId
}) => {
  const [satisfactionData, setSatisfactionData] = useState<SatisfactionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSatisfactionMetrics();
  }, [landlordId, portfolioId]);

  const fetchSatisfactionMetrics = async () => {
    try {
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          lease_start_date,
          lease_end_date,
          status,
          property_applications!inner (
            id,
            tenant_id,
            status,
            created_at,
            profiles!property_applications_tenant_id_fkey (
              id,
              first_name,
              last_name
            )
          ),
          maintenance_requests (
            id,
            status,
            created_at,
            completed_date
          )
        `)
        .eq('owner_id', landlordId)
        .eq('property_applications.status', 'approved');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        const satisfactionMetrics: SatisfactionData[] = properties.map(property => {
          const tenant = property.property_applications[0]?.profiles;
          const maintenanceRequests = property.maintenance_requests || [];
          const messageCount = Math.floor(Math.random() * 10); // Mock message count
          
          // Calculate communication score based on message frequency and response times
          const communicationScore = Math.min(100, Math.max(0, 85 - (messageCount * 2))); // More messages = potential issues
          
          // Calculate maintenance score based on completion rates and response times
          const completedMaintenance = maintenanceRequests.filter(req => req.status === 'completed');
          const maintenanceScore = maintenanceRequests.length > 0 
            ? (completedMaintenance.length / maintenanceRequests.length) * 100 
            : 90;
          
          // Calculate average response time (mock calculation)
          const responseTime = maintenanceRequests.length > 0 
            ? maintenanceRequests.reduce((acc, req) => {
                if (req.completed_date) {
                  const days = Math.ceil((new Date(req.completed_date).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return acc + days;
                }
                return acc + 7; // Default 7 days for incomplete requests
              }, 0) / maintenanceRequests.length
            : 3; // Default 3 days
          
          // Overall satisfaction (weighted average)
          const overallSatisfaction = (communicationScore * 0.4 + maintenanceScore * 0.6);
          
          // Risk assessment
          let riskLevel: 'low' | 'medium' | 'high' = 'low';
          if (overallSatisfaction < 60) riskLevel = 'high';
          else if (overallSatisfaction < 80) riskLevel = 'medium';
          
          const lastInteraction = property.property_applications[0]?.created_at || new Date().toISOString();
          
          return {
            propertyId: property.id,
            address: property.address,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant',
            communicationScore,
            maintenanceScore,
            responseTime,
            overallSatisfaction,
            riskLevel,
            lastInteraction
          };
        });

        setSatisfactionData(satisfactionMetrics);
      }
    } catch (error) {
      console.error('Error fetching satisfaction metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageMetrics = {
    overallSatisfaction: satisfactionData.reduce((acc, d) => acc + d.overallSatisfaction, 0) / (satisfactionData.length || 1),
    communicationScore: satisfactionData.reduce((acc, d) => acc + d.communicationScore, 0) / (satisfactionData.length || 1),
    maintenanceScore: satisfactionData.reduce((acc, d) => acc + d.maintenanceScore, 0) / (satisfactionData.length || 1),
    avgResponseTime: satisfactionData.reduce((acc, d) => acc + d.responseTime, 0) / (satisfactionData.length || 1),
    highRiskTenants: satisfactionData.filter(d => d.riskLevel === 'high').length,
    mediumRiskTenants: satisfactionData.filter(d => d.riskLevel === 'medium').length
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
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
              <p className="text-sm text-muted-foreground">Overall Satisfaction</p>
              <p className={`text-2xl font-bold ${getScoreColor(averageMetrics.overallSatisfaction)}`}>
                {averageMetrics.overallSatisfaction.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-success/10 border border-success/20">
              <Heart className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-openkey-blue/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Communication</p>
              <p className={`text-2xl font-bold ${getScoreColor(averageMetrics.communicationScore)}`}>
                {averageMetrics.communicationScore.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-subtle-blue border border-openkey-blue/20">
              <MessageSquare className="h-6 w-6 text-openkey-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-openkey-gold/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Maintenance</p>
              <p className={`text-2xl font-bold ${getScoreColor(averageMetrics.maintenanceScore)}`}>
                {averageMetrics.maintenanceScore.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-subtle-gold border border-openkey-gold/20">
              <Wrench className="h-6 w-6 text-openkey-gold" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-info/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-2xl font-bold text-gradient-blue-gold">{averageMetrics.avgResponseTime.toFixed(1)}d</p>
            </div>
            <div className="p-2 rounded-lg bg-info/10 border border-info/20">
              <Clock className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 card-hover-gold border-openkey-blue/20">
          <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Satisfaction Breakdown</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-openkey-blue">Overall Satisfaction</span>
                <span className="text-openkey-gold font-medium">{averageMetrics.overallSatisfaction.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.overallSatisfaction} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-openkey-blue">Communication Score</span>
                <span className="text-openkey-gold font-medium">{averageMetrics.communicationScore.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.communicationScore} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-openkey-blue">Maintenance Score</span>
                <span className="text-openkey-gold font-medium">{averageMetrics.maintenanceScore.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.maintenanceScore} className="h-2" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-hover-gold border-openkey-gold/20">
          <div className="bg-gradient-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg border border-danger/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-danger" />
                <span className="text-sm font-medium text-danger">High Risk Tenants</span>
              </div>
              <Badge variant="destructive" className="bg-danger text-white">{averageMetrics.highRiskTenants}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">Medium Risk Tenants</span>
              </div>
              <Badge variant="warning" className="bg-warning text-white">{averageMetrics.mediumRiskTenants}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Low Risk Tenants</span>
              </div>
              <Badge variant="secondary" className="bg-success text-white">
                {satisfactionData.length - averageMetrics.highRiskTenants - averageMetrics.mediumRiskTenants}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 card-hover-gold border-openkey-blue/20">
        <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-white">Individual Tenant Scores</h3>
        </div>
        <div className="space-y-3">
          {satisfactionData.map((tenant, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gradient-subtle-blue rounded-lg border border-openkey-blue/10 hover:bg-openkey-blue/10 transition-all duration-200">
              <div className="flex-1">
                <p className="font-medium text-openkey-blue">{tenant.address}</p>
                <p className="text-sm text-muted-foreground">{tenant.tenantName}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p>Overall: <span className={getScoreColor(tenant.overallSatisfaction)}>{tenant.overallSatisfaction.toFixed(1)}%</span></p>
                  <p className="text-openkey-gold">Response: {tenant.responseTime.toFixed(1)}d</p>
                </div>
                
                <Badge variant={getRiskColor(tenant.riskLevel) as any} className="border border-openkey-gold/20">
                  {tenant.riskLevel} risk
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TenantSatisfactionMetrics;